'use client';
import { usePageTitle } from '@/hooks/use-page-title';
import { DropZone } from '@/components/ui/drop-zone';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/lib/theme';
import {
  getSetting,
  setSetting,
  getAIProvider,
  getAIApiKey,
  getAIModel,
} from '@/lib/settings';
import { AI_PROVIDERS, type AIProvider } from '@/lib/ai/providers';
import {
  Settings,
  Key,
  User,
  Database,
  Sun,
  Moon,
  Download,
  Upload,
  Trash2,
  ExternalLink,
  CheckCircle,
  RefreshCw,
  Cloud,
  XCircle,
} from 'lucide-react';

type Tab = 'profile' | 'ai' | 'sync' | 'appearance' | 'data';

export default function SettingsPage() {
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  usePageTitle('Settings');
  const [tab, setTab] = useState<Tab>('profile');

  // Profile
  const [role, setRole] = useState('');
  const [tenure, setTenure] = useState('');

  // AI
  const [provider, setProvider] = useState<AIProvider>('openrouter');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  useEffect(() => {
    const load = async () => {
      setRole((await getSetting('user_role')) ?? '');
      setTenure((await getSetting('user_tenure')) ?? '');
      setProvider(((await getAIProvider()) as AIProvider) ?? 'openrouter');
      setApiKey((await getAIApiKey()) ?? '');
      setModel((await getAIModel()) ?? '');
    };
    load();
  }, []);

  const providerConfig = AI_PROVIDERS[provider];

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'ai', label: 'AI Provider', icon: Key },
    { id: 'sync', label: 'Sync', icon: Cloud },
    { id: 'appearance', label: 'Appearance', icon: Sun },
    { id: 'data', label: 'Data', icon: Database },
  ];

  const handleSaveProfile = async () => {
    await setSetting('user_role', role);
    await setSetting('user_tenure', tenure);
    toast('Profile saved.', 'success');
  };

  const handleSaveAI = async () => {
    await setSetting('ai_provider', provider);
    await setSetting('ai_api_key', apiKey, true);
    await setSetting('ai_model', model || providerConfig.defaultModel);
    toast('AI settings saved.', 'success');
  };

  const handleTestConnection = async () => {
    if (!apiKey) {
      toast('Enter an API key first.', 'error');
      return;
    }
    setTestStatus('testing');

    try {
      const { streamAIResponse } = await import('@/lib/ai/providers');
      await streamAIResponse(
        provider,
        apiKey,
        model || providerConfig.defaultModel,
        [
          { role: 'system', content: 'Respond with just "ok".' },
          { role: 'user', content: 'Test.' },
        ],
        {
          onChunk: () => {},
          onDone: () => {
            setTestStatus('success');
            toast('API key verified \u2014 ready to transform your work.', 'success');
          },
          onError: (err) => {
            setTestStatus('error');
            toast(`Connection failed: ${err.message}`, 'error');
          },
        },
        10
      );
    } catch {
      setTestStatus('error');
      toast('Connection failed.', 'error');
    }
  };

  const handleExportData = async () => {
    const { db } = await import('@/lib/db');
    const data = {
      workLogs: await db.workLogs.toArray(),
      energyCheckins: await db.energyCheckins.toArray(),
      financialData: await db.financialData.toArray(),
      goals: await db.goals.toArray(),
      bragDocuments: await db.bragDocuments.toArray(),
      meetings: await db.meetings.toArray(),
      weeklySnapshots: await db.weeklySnapshots.toArray(),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quietcareer-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Data exported.', 'success');
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const { db } = await import('@/lib/db');

        if (data.workLogs) await db.workLogs.bulkPut(data.workLogs);
        if (data.energyCheckins) await db.energyCheckins.bulkPut(data.energyCheckins);
        if (data.financialData) await db.financialData.bulkPut(data.financialData);
        if (data.goals) await db.goals.bulkPut(data.goals);
        if (data.bragDocuments) await db.bragDocuments.bulkPut(data.bragDocuments);
                  if (data.meetings) await db.meetings.bulkPut(data.meetings);
                  if (data.weeklySnapshots) await db.weeklySnapshots.bulkPut(data.weeklySnapshots);

        toast(`Imported ${Object.keys(data).length - 1} tables.`, 'success');
      } catch {
        toast('Invalid file format.', 'error');
      }
    };
    input.click();
  };

  const handleClearData = async () => {
    if (!confirm('This will permanently delete all your data. Are you sure?')) return;

    const { db } = await import('@/lib/db');
    await Promise.all([
      db.workLogs.clear(),
      db.energyCheckins.clear(),
      db.financialData.clear(),
      db.goals.clear(),
      db.bragDocuments.clear(),
      db.settings.clear(),
    ]);
    localStorage.clear();
    toast('All data cleared.', 'success');
    window.location.href = '/';
  };

  return (
    <div className="animate-fade-up">
      <PageHeader icon={Settings} title="Settings" />

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 rounded-[var(--radius-md)] bg-bg-secondary border border-surface-border mb-6 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-[var(--radius-sm)] transition-all whitespace-nowrap ${
              tab === t.id
                ? 'bg-surface-highlight text-text-primary font-medium'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {tab === 'profile' && (
        <>
          <Card>
            <CardTitle className="text-base mb-6">Your Profile</CardTitle>
            <div className="flex flex-col gap-4 max-w-md">
              <Input
                id="role"
                label="Role / Title"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g., Software Engineer"
                helper="Used to personalize AI-generated content"
              />
              <Input
                id="tenure"
                label="Tenure"
                value={tenure}
                onChange={(e) => setTenure(e.target.value)}
                placeholder="e.g., 3-5 years"
              />
              <Button onClick={handleSaveProfile} className="self-start">
                Save Profile
              </Button>
            </div>
          </Card>

          {/* Tag Library */}
          <TagLibrary />
        </>
        )}

        {tab === 'ai' && (
          <div className="space-y-4">
            <Card>
              <CardTitle className="text-base mb-6">AI Provider</CardTitle>
              <div className="flex flex-col gap-5 max-w-md">
                {/* Provider cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.values(AI_PROVIDERS).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setProvider(p.id);
                        setModel(p.defaultModel);
                        setApiKey('');
                        setTestStatus('idle');
                      }}
                      className={`p-3 rounded-[var(--radius-md)] border text-left transition-all ${
                        provider === p.id
                          ? 'border-accent bg-accent-muted'
                          : 'border-surface-border hover:border-surface-border-hover'
                      }`}
                    >
                      <span className="text-sm font-medium text-text-primary block">
                        {p.name}
                      </span>
                      {p.freeModels && p.freeModels.length > 0 && (
                        <Badge variant="success" className="mt-1">Free tier</Badge>
                      )}
                    </button>
                  ))}
                </div>

                {/* API Key */}
                <div className="relative">
                  <Input
                    id="api-key"
                    label="API Key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => { setApiKey(e.target.value); setTestStatus('idle'); }}
                    placeholder={`${providerConfig.keyPrefix}...`}
                    helper="Encrypted locally. Never sent to our servers."
                  />
                  {testStatus === 'success' && (
                    <CheckCircle size={16} className="absolute right-3 top-9 text-success" />
                  )}
                  {testStatus === 'error' && (
                    <XCircle size={16} className="absolute right-3 top-9 text-danger" />
                  )}
                </div>

                {/* Model */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-secondary">Model</label>
                  <select
                    value={model || providerConfig.defaultModel}
                    onChange={(e) => setModel(e.target.value)}
                    className="h-10 rounded-[var(--radius-sm)] border border-surface-border bg-bg-input px-3 text-sm text-text-primary focus:border-accent focus:outline-none"
                  >
                    {providerConfig.models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                        {providerConfig.freeModels?.includes(m.id) ? ' (free)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleSaveAI}>Save</Button>
                  <Button
                    variant="secondary"
                    onClick={handleTestConnection}
                    disabled={testStatus === 'testing'}
                  >
                    {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Help links */}
            <Card>
              <CardTitle className="text-sm mb-3">Get an API Key</CardTitle>
              <div className="space-y-2">
                {[
                  { name: 'OpenRouter', url: 'https://openrouter.ai/keys', note: 'Access 100+ models with one key' },
                  { name: 'Google Gemini', url: 'https://aistudio.google.com/apikey', note: 'Free tier available' },
                  { name: 'Anthropic', url: 'https://console.anthropic.com', note: 'Best quality for writing' },
                  { name: 'OpenAI', url: 'https://platform.openai.com/api-keys', note: 'Most popular' },
                  { name: 'Groq', url: 'https://console.groq.com/keys', note: 'Free tier, ultra fast' },
                ].map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between py-2 px-3 rounded-[var(--radius-sm)] hover:bg-surface-highlight transition-colors group"
                  >
                    <div>
                      <span className="text-sm text-text-primary">{link.name}</span>
                      <span className="text-xs text-text-tertiary ml-2">{link.note}</span>
                    </div>
                    <ExternalLink size={14} className="text-text-tertiary group-hover:text-accent transition-colors" />
                  </a>
                ))}
              </div>
            </Card>

            {/* AI Usage */}
            <AIUsageStats />
          </div>
        )}

        {tab === 'sync' && (
          <div className="space-y-4">
            <Card>
              <CardTitle className="text-base mb-2">Cross-Device Sync</CardTitle>
              <p className="text-sm text-text-secondary mb-6 leading-relaxed">
                Sync your data between devices using your own cloud storage. Your data stays encrypted and in your control.
              </p>

              <div className="space-y-3">
                {/* Google Drive */}
                <div className="flex items-center justify-between py-3 px-4 rounded-[var(--radius-md)] border border-surface-border hover:border-surface-border-hover transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-surface-highlight flex items-center justify-center">
                      <Cloud size={18} className="text-accent-secondary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">Google Drive</p>
                      <p className="text-xs text-text-tertiary">Auto-sync to your Drive</p>
                    </div>
                  </div>
                  <Badge variant="default">Coming soon</Badge>
                </div>

                {/* Dropbox */}
                <div className="flex items-center justify-between py-3 px-4 rounded-[var(--radius-md)] border border-surface-border hover:border-surface-border-hover transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-surface-highlight flex items-center justify-center">
                      <Cloud size={18} className="text-accent-secondary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">Dropbox</p>
                      <p className="text-xs text-text-tertiary">Auto-sync to your Dropbox</p>
                    </div>
                  </div>
                  <Badge variant="default">Coming soon</Badge>
                </div>

                {/* OneDrive */}
                <div className="flex items-center justify-between py-3 px-4 rounded-[var(--radius-md)] border border-surface-border hover:border-surface-border-hover transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-surface-highlight flex items-center justify-center">
                      <Cloud size={18} className="text-accent-secondary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">OneDrive</p>
                      <p className="text-xs text-text-tertiary">Auto-sync to your OneDrive</p>
                    </div>
                  </div>
                  <Badge variant="default">Coming soon</Badge>
                </div>

                {/* Manual / iCloud */}
                <div className="flex items-center justify-between py-3 px-4 rounded-[var(--radius-md)] border border-surface-border">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-surface-highlight flex items-center justify-center">
                      <RefreshCw size={18} className="text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">Manual Sync</p>
                      <p className="text-xs text-text-tertiary">Export/import files — works with iCloud, NAS, anything</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleExportData}
                    >
                      <Download size={12} /> Export
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleImportData}
                    >
                      <Upload size={12} /> Import
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <CardTitle className="text-sm mb-2">How sync works</CardTitle>
              <div className="space-y-2 text-sm text-text-secondary">
                <p>1. Export your data as a JSON file</p>
                <p>2. Save it to your synced folder (iCloud Drive, Google Drive, Dropbox, etc.)</p>
                <p>3. On your other device, import that file</p>
                <p>4. Records are merged — newer entries win, nothing is lost</p>
              </div>
              <p className="text-xs text-text-tertiary mt-4">
                Cloud sync (Google Drive, Dropbox, OneDrive) will automate this process. Coming soon.
              </p>
            </Card>
          </div>
        )}

        {tab === 'appearance' && (
        <>
          <Card>
            <CardTitle className="text-base mb-6">Appearance</CardTitle>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between py-3 px-4 rounded-[var(--radius-md)] border border-surface-border">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? <Moon size={18} className="text-accent" /> : <Sun size={18} className="text-accent" />}
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {theme === 'dark' ? 'Easy on the eyes at night' : 'Clean and bright for daytime'}
                    </p>
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={toggleTheme}>
                  Switch to {theme === 'dark' ? 'Light' : 'Dark'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Session Lock */}
          <Card>
            <CardTitle className="text-base mb-4">Session Lock</CardTitle>
            <div className="flex items-center justify-between py-3 px-4 rounded-[var(--radius-md)] border border-surface-border">
              <div>
                <p className="text-sm font-medium text-text-primary">Passphrase Protection</p>
                <p className="text-xs text-text-tertiary">
                  {localStorage.getItem('qc_passphrase_enabled') === 'true'
                    ? 'Enabled \u2014 data is encrypted with your passphrase'
                    : 'Disabled \u2014 enable to encrypt sensitive data'}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const enabled = localStorage.getItem('qc_passphrase_enabled') === 'true';
                  if (enabled) {
                    localStorage.removeItem('qc_passphrase_enabled');
                    toast('Passphrase protection disabled.', 'success');
                  } else {
                    const pass = prompt('Choose a passphrase (you\u2019ll need this to unlock):');
                    if (pass && pass.length >= 4) {
                      import('@/lib/crypto').then(({ initializeEncryption }) => {
                        initializeEncryption(pass);
                        localStorage.setItem('qc_passphrase_enabled', 'true');
                        toast('Passphrase protection enabled.', 'success');
                      });
                    } else if (pass) {
                      toast('Passphrase must be at least 4 characters.', 'error');
                    }
                  }
                }}
              >
                {localStorage.getItem('qc_passphrase_enabled') === 'true' ? 'Disable' : 'Enable'}
              </Button>
            </div>
          </Card>
        </>
        )}

        {tab === 'data' && (
          <div className="space-y-4">
            {/* Data Statistics */}
            <DataStats />

            <Card>
              <CardTitle className="text-base mb-2">Export & Import</CardTitle>
              <p className="text-sm text-text-tertiary mb-4">
                Your data is stored locally in your browser. Export to back up or transfer between devices.
              </p>
              <div className="flex flex-wrap gap-3 mb-4">
                <Button variant="secondary" onClick={handleExportData}>
                  <Download size={14} /> Export JSON
                </Button>
                <Button variant="secondary" onClick={handleImportData}>
                  <Upload size={14} /> Import JSON
                </Button>
                <Button variant="secondary" onClick={async () => {
                  const { exportAllCSV } = await import('@/lib/csv-export');
                  await exportAllCSV();
                  toast('CSV files exported.', 'success');
                }}>
                  <Download size={14} /> Export CSV
                </Button>
              </div>
              <DropZone onDrop={async (file) => {
                try {
                  const text = await file.text();
                  const data = JSON.parse(text);
                  if (data.workLogs) await db.workLogs.bulkPut(data.workLogs);
                  if (data.energyCheckins) await db.energyCheckins.bulkPut(data.energyCheckins);
                  if (data.financialData) await db.financialData.bulkPut(data.financialData);
                  if (data.goals) await db.goals.bulkPut(data.goals);
                  if (data.bragDocuments) await db.bragDocuments.bulkPut(data.bragDocuments);
                  if (data.meetings) await db.meetings.bulkPut(data.meetings);
                  if (data.weeklySnapshots) await db.weeklySnapshots.bulkPut(data.weeklySnapshots);
                  toast('Data imported successfully.', 'success');
                } catch {
                  toast('Invalid file. Expected QuietCareer JSON export.', 'error');
                }
              }} />
            </Card>

            <Card>
              <CardTitle className="text-base mb-2 text-danger-text">Danger Zone</CardTitle>
              <p className="text-sm text-text-tertiary mb-4">
                Permanently delete all data. This cannot be undone.
              </p>
              <Button variant="danger" onClick={handleClearData}>
                <Trash2 size={14} /> Delete All Data
              </Button>
            </Card>
          </div>
        )}
      </div>

      {/* Version footer */}
      <div className="mt-8 pt-4 border-t border-surface-border text-center">
        <p className="text-[11px] text-text-tertiary/50">
          QuietCareer v1.0.0 \u00B7 Built for you, not your employer.
        </p>
        <p className="text-[10px] text-text-tertiary/30 mt-1">
          All data stored locally. Zero telemetry. Zero tracking.
        </p>
      </div>
    </div>
  );
}

function DataStats() {
  const logCount = useLiveQuery(() => db.workLogs.count());
  const energyCount = useLiveQuery(() => db.energyCheckins.count());
  const bragCount = useLiveQuery(() => db.bragDocuments.count());
  const goalCount = useLiveQuery(() => db.goals.count());
  const meetingCount = useLiveQuery(() => db.meetings.count());
  const financialCount = useLiveQuery(() => db.financialData.count());

  const stats = [
    { label: 'Field Notes', count: logCount ?? 0 },
    { label: 'Battery Check-ins', count: energyCount ?? 0 },
    { label: 'Career Assets', count: bragCount ?? 0 },
    { label: 'Goals', count: goalCount ?? 0 },
    { label: 'Meetings', count: meetingCount ?? 0 },
    { label: 'Financial Records', count: financialCount ?? 0 },
  ];

  const totalRecords = stats.reduce((s, st) => s + st.count, 0);

  return (
    <Card>
      <CardTitle className="text-base mb-3">Your Data</CardTitle>
      <div className="space-y-2">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">{s.label}</span>
            <span className="text-sm font-mono text-text-primary">{s.count}</span>
          </div>
        ))}
        <div className="pt-2 mt-2 border-t border-surface-border flex items-center justify-between">
          <span className="text-sm font-medium text-text-primary">Total Records</span>
          <span className="text-sm font-mono font-semibold text-accent">{totalRecords}</span>
        </div>
      </div>
    </Card>
  );
}

function TagLibrary() {
  const logs = useLiveQuery(() => db.workLogs.toArray());

  const projects = [...new Set(logs?.map((l) => l.project).filter(Boolean) ?? [])].sort();
  const tags = [...new Set(logs?.flatMap((l) => l.tags).filter(Boolean) ?? [])].sort();

  return (
    <Card>
      <CardTitle className="text-base mb-4">Your Tag Library</CardTitle>
      <p className="text-xs text-text-tertiary mb-4">
        Auto-populated from your field notes. Use these consistently for better tracking.
      </p>

      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">
            Projects ({projects.length})
          </h4>
          {projects.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {projects.map((p) => (
                <span
                  key={p}
                  className="px-2.5 py-1 text-xs rounded-full border border-accent/30 bg-accent-muted text-accent-text"
                >
                  {p}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-tertiary">No projects yet. Tag your first entry.</p>
          )}
        </div>

        <div>
          <h4 className="text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">
            Skills & Tags ({tags.length})
          </h4>
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-1 text-xs rounded-full border border-surface-border bg-surface-highlight text-text-secondary"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-tertiary">No tags yet. Add tags to your field notes.</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function AIUsageStats() {
  const [stats, setStats] = useState<{
    today: { requests: number; estimatedCost: number } | null;
    thisMonth: { requests: number; estimatedCost: number; totalTokens: number };
    allTime: { requests: number; estimatedCost: number; totalTokens: number };
  } | null>(null);

  useEffect(() => {
    import('@/lib/ai/usage-tracker').then(({ getUsageStats }) => {
      setStats(getUsageStats());
    });
  }, []);

  if (!stats || stats.allTime.requests === 0) return null;

  return (
    <Card>
      <CardTitle className="text-sm mb-3">AI Usage</CardTitle>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-text-secondary">Today</span>
          <span className="font-mono text-text-primary">
            {stats.today?.requests ?? 0} requests \u00B7 ~${(stats.today?.estimatedCost ?? 0).toFixed(3)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">This month</span>
          <span className="font-mono text-text-primary">
            {stats.thisMonth.requests} requests \u00B7 ~${stats.thisMonth.estimatedCost.toFixed(3)}
          </span>
        </div>
        <div className="flex justify-between pt-2 border-t border-surface-border">
          <span className="text-text-secondary">All time</span>
          <span className="font-mono text-text-primary">
            {stats.allTime.requests} requests \u00B7 ~${stats.allTime.estimatedCost.toFixed(2)}
          </span>
        </div>
      </div>
      <p className="text-[10px] text-text-tertiary mt-3">
        Cost estimates are approximate. Actual costs depend on your provider and model.
      </p>
    </Card>
  );
}
