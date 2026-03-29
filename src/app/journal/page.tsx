'use client';
import { usePageTitle } from '@/hooks/use-page-title';

import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ImpactType } from '@/lib/db';
import { generateId, now, todayISO, relativeTime } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import {
  PenLine,
  Sparkles,
  Tag,
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { copy } from '@/lib/copy';
import { scheduleBackup } from '@/lib/auto-backup';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { encryptWorkLog, decryptWorkLogs } from '@/lib/field-encryption';
import { Highlight } from '@/components/ui/highlight';
import { getAIApiKey, getAIProvider, getAIModel, getUserRole } from '@/lib/settings';
import { AI_PROVIDERS, streamAIResponse, type AIProvider } from '@/lib/ai/providers';
import { rewriteAsImpact } from '@/lib/ai/prompts';

const IMPACT_TYPES: { value: ImpactType; label: string; emoji: string }[] = [
  { value: 'shipped', label: 'Shipped', emoji: '\u{1F680}' },
  { value: 'improved', label: 'Improved', emoji: '\u{2728}' },
  { value: 'fixed', label: 'Fixed', emoji: '\u{1F527}' },
  { value: 'led', label: 'Led', emoji: '\u{1F451}' },
  { value: 'learned', label: 'Learned', emoji: '\u{1F4DA}' },
  { value: 'mentored', label: 'Mentored', emoji: '\u{1F91D}' },
  { value: 'proposed', label: 'Proposed', emoji: '\u{1F4A1}' },
  { value: 'documented', label: 'Documented', emoji: '\u{1F4DD}' },
  { value: 'other', label: 'Other', emoji: '\u{1F4CC}' },
];

export default function JournalPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  usePageTitle('Field Notes');
  const [content, setContent] = useState('');
  const [project, setProject] = useState('');
  const [impactType, setImpactType] = useState<ImpactType>('other');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [mood, setMood] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(true);
  const [rewritingId, setRewritingId] = useState<string | null>(null);

  const rawLogs = useLiveQuery(
    () => db.workLogs.orderBy('createdAt').reverse().limit(30).toArray()
  );
  const [recentLogs, setRecentLogs] = useState(rawLogs);

  // Decrypt logs when they change
  useEffect(() => {
    if (!rawLogs) return;
    decryptWorkLogs(rawLogs).then(setRecentLogs);
  }, [rawLogs]);

  const totalCount = useLiveQuery(() => db.workLogs.count());

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSaving(true);

    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const entry = await encryptWorkLog({
      id: generateId(),
      date: todayISO(),
      content: content.trim(),
      tags: tagList,
      impactType,
      project: project.trim(),
      aiRewrite: null,
      mood,
      isPrivate: false,
      isPinned: false,
      createdAt: now(),
      updatedAt: now(),
    });
    await db.workLogs.add(entry);

    setContent('');
    setProject('');
    setTags('');
    setImpactType('other');
    setMood(null);
    setSaving(false);
    toast(copy.entryToast(), 'success');
    scheduleBackup();
  };

  const handleAIRewrite = async (logId: string, logContent: string) => {
    setRewritingId(logId);
    const provider = (await getAIProvider()) as AIProvider;
    const apiKey = await getAIApiKey();
    const model = await getAIModel();
    const role = (await getUserRole()) ?? 'professional';

    if (!apiKey) {
      toast('Set up your AI provider in Settings first.', 'error');
      setRewritingId(null);
      return;
    }

    const messages = rewriteAsImpact(logContent, role);
    const config = AI_PROVIDERS[provider];
    let fullText = '';

    await streamAIResponse(
      provider,
      apiKey,
      model ?? config.defaultModel,
      messages,
      {
        onChunk: (text) => { fullText += text; },
        onDone: async (finalText) => {
          await db.workLogs.update(logId, { aiRewrite: finalText, updatedAt: now() });
          setRewritingId(null);
          toast('Impact statement generated.', 'success');
        },
        onError: (err) => {
          setRewritingId(null);
          toast(`Failed: ${err.message}`, 'error');
        },
      }
    );
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleEdit = (logId: string, content: string) => {
    setEditingId(logId);
    setEditContent(content);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    await db.workLogs.update(editingId, { content: editContent.trim(), updatedAt: now() });
    setEditingId(null);
    setEditContent('');
    toast('Updated.', 'success');
  };

  const handleDelete = async (logId: string) => {
    const ok = await confirm({ title: 'Delete entry?', description: 'This cannot be undone. The entry will be permanently removed.', confirmLabel: 'Delete', variant: 'danger' });
    if (!ok) return;
    await db.workLogs.delete(logId);
    toast('Entry removed.', 'success');
  };

  const handlePin = async (logId: string, currentlyPinned: boolean) => {
    await db.workLogs.update(logId, { isPinned: !currentlyPinned, updatedAt: now() });
    toast(currentlyPinned ? 'Unpinned.' : 'Pinned to top.', 'success');
  };

  // Group logs by date (pinned entries first)
  const sortedLogs = [...(recentLogs ?? [])].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.createdAt - a.createdAt;
  });

  const filteredLogs = sortedLogs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.content.toLowerCase().includes(q) ||
      log.project.toLowerCase().includes(q) ||
      log.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const groupedLogs: Record<string, typeof filteredLogs> = {};
  filteredLogs?.forEach((log) => {
    if (!groupedLogs[log.date]) groupedLogs[log.date] = [];
    groupedLogs[log.date]!.push(log);
  });

  const formatDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMMM d');
  };

  return (
    <div className="space-y-6">
      {/* Toggle form */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {showForm ? 'Hide Form' : 'New Entry'}
        </Button>
      </div>

      {/* New Entry Form */}
      {showForm && (
        <Card className="animate-fade-up">
          <div className="flex flex-col gap-4">
            <Textarea
              id="content"
              placeholder="What actually happened at work today?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
            />

            {/* Quick-add templates */}
            {!content && (
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Led a meeting about ',
                  'Fixed a bug in ',
                  'Shipped ',
                  'Helped a teammate with ',
                  'Presented ',
                  'Wrote docs for ',
                  'Reviewed code for ',
                ].map((template) => (
                  <button
                    key={template}
                    onClick={() => setContent(template)}
                    className="px-2.5 py-1 text-xs rounded-full border border-surface-border text-text-tertiary hover:border-accent/50 hover:text-text-secondary transition-all"
                  >
                    {template}...
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                id="project"
                label="Project"
                placeholder="e.g., Dashboard Redesign"
                value={project}
                onChange={(e) => setProject(e.target.value)}
              />
              <Input
                id="tags"
                label="Tags"
                placeholder="leadership, debugging, frontend"
                helper="Comma-separated"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>

            {/* Impact Type */}
            <div>
              <label className="text-sm font-medium text-text-secondary mb-2 block">
                Impact Type
              </label>
              <div className="flex flex-wrap gap-1.5">
                {IMPACT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setImpactType(t.value)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-all duration-150 ${
                      impactType === t.value
                        ? 'border-accent bg-accent-muted text-accent-text scale-[1.02]'
                        : 'border-surface-border text-text-tertiary hover:border-surface-border-hover hover:text-text-secondary'
                    }`}
                  >
                    <span>{t.emoji}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mood (optional) */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-tertiary">Mood:</span>
              <div className="flex gap-1">
                {[
                  { val: 1, emoji: '\u{1F614}' },
                  { val: 2, emoji: '\u{1F610}' },
                  { val: 3, emoji: '\u{1F642}' },
                  { val: 4, emoji: '\u{1F60A}' },
                  { val: 5, emoji: '\u{1F929}' },
                ].map((m) => (
                  <button
                    key={m.val}
                    onClick={() => setMood(mood === m.val ? null : m.val)}
                    aria-label={`Mood ${m.val} of 5`}
                    className={`w-8 h-8 rounded-full text-sm transition-all ${
                      mood === m.val
                        ? 'bg-accent-muted scale-110 ring-1 ring-accent'
                        : 'hover:bg-surface-highlight opacity-50 hover:opacity-100'
                    }`}
                  >
                    {m.emoji}
                  </button>
                ))}
              </div>
              {mood && (
                <span className="text-[10px] text-text-tertiary">optional</span>
              )}
            </div>

            {/* Lunch (passive spend tracking — optional) */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-tertiary">Lunch:</span>
              {(['brought', 'bought', 'skipped'] as const).map((choice) => (
                <button
                  key={choice}
                  onClick={() => {
                    const current = localStorage.getItem('qc_lunch_today');
                    if (current === choice) {
                      localStorage.removeItem('qc_lunch_today');
                    } else {
                      localStorage.setItem('qc_lunch_today', choice);
                      // Track for insights
                      const history = JSON.parse(localStorage.getItem('qc_lunch_history') ?? '[]');
                      history.push({ date: todayISO(), choice });
                      localStorage.setItem('qc_lunch_history', JSON.stringify(history.slice(-90)));
                    }
                  }}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                    localStorage.getItem('qc_lunch_today') === choice
                      ? 'border-accent bg-accent-muted text-accent-text'
                      : 'border-surface-border text-text-tertiary hover:border-surface-border-hover'
                  }`}
                >
                  {choice === 'brought' ? '\u{1F371} Brought' : choice === 'bought' ? '\u{1F4B5} Bought' : '\u{23ED}\u{FE0F} Skipped'}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                onClick={handleSubmit}
                disabled={!content.trim() || saving}
              >
                {saving ? 'Saving...' : 'Save Entry'}
              </Button>
              <span className="text-xs text-text-tertiary">
                {content.length > 0 ? `${content.length} characters` : ''}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Search */}
      {(totalCount ?? 0) > 0 && (
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="text"
            placeholder="Search entries..."
            aria-label="Search field notes"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-[var(--radius-sm)] border border-surface-border bg-bg-input text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          />
        </div>
      )}

      {/* Entries by date */}
      {Object.keys(groupedLogs).length === 0 && (totalCount ?? 0) === 0 && (
        <EmptyState
          icon={PenLine}
          title="Nothing here yet. That's fine."
          description="Your first entry doesn't need to be good. Just write what happened today — even one sentence counts. The AI handles the rest."
        />
      )}

      {Object.entries(groupedLogs).map(([date, logs]) => (
        <div key={date}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm font-medium text-text-secondary">
              {formatDateLabel(date)}
            </span>
            <div className="flex-1 h-px bg-surface-border" />
            <Badge variant="muted">{logs!.length}</Badge>
          </div>

          <div className="space-y-2">
            {logs!.map((log) => {
              const impactInfo = IMPACT_TYPES.find((t) => t.value === log.impactType);
              return (
                <Card
                  key={log.id}
                  className="group hover:border-surface-border-hover transition-all duration-150"
                >
                  <div className="flex gap-3">
                    {/* Impact emoji */}
                    <div className="w-8 h-8 rounded-lg bg-surface-highlight flex items-center justify-center shrink-0 text-sm">
                      {impactInfo?.emoji ?? '\u{1F4CC}'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary leading-relaxed">
                        <Highlight text={log.content} query={searchQuery} />
                        {log.mood && (
                          <span className="ml-2 text-xs opacity-60">
                            {['\u{1F614}', '\u{1F610}', '\u{1F642}', '\u{1F60A}', '\u{1F929}'][log.mood - 1]}
                          </span>
                        )}
                      </p>

                      {/* AI rewrite */}
                      {log.aiRewrite && (
                        <div className="mt-2 pl-3 border-l-2 border-accent/50">
                          <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Sparkles size={10} className="text-accent" /> Impact version
                          </p>
                          <p className="text-sm text-accent-text/80 leading-relaxed">
                            {log.aiRewrite}
                          </p>
                        </div>
                      )}

                      {/* Tags row */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {log.project && (
                          <Badge variant="accent">{log.project}</Badge>
                        )}
                        <Badge variant="default">{impactInfo?.label ?? 'Other'}</Badge>
                        {log.tags.map((tag) => (
                          <Badge key={tag} variant="muted">
                            <Tag size={8} />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-[11px] text-text-tertiary font-mono">
                        {relativeTime(log.createdAt)}
                      </span>
                      <div className="flex items-center gap-2 opacity-40 md:opacity-0 group-hover:opacity-100 transition-all">
                        {!log.aiRewrite && (
                          <button
                            onClick={() => handleAIRewrite(log.id, log.content)}
                            disabled={rewritingId === log.id}
                            className="text-xs text-accent hover:text-accent-hover flex items-center gap-1"
                          >
                            <Sparkles size={10} />
                            {rewritingId === log.id ? '...' : 'AI'}
                          </button>
                        )}
                        <button
                          onClick={() => handlePin(log.id, log.isPinned)}
                          className={`text-xs transition-colors ${log.isPinned ? 'text-accent' : 'text-text-tertiary hover:text-accent'}`}
                          aria-label={log.isPinned ? 'Unpin' : 'Pin'}
                        >
                          {log.isPinned ? '\u{1F4CC}' : 'Pin'}
                        </button>
                        <button
                          onClick={() => handleEdit(log.id, log.content)}
                          className="text-xs text-text-tertiary hover:text-text-secondary"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(log.id)}
                          className="text-xs text-text-tertiary hover:text-danger-text"
                        >
                          \u00D7
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Inline edit */}
                  {editingId === log.id && (
                    <div className="mt-3 pt-3 border-t border-surface-border animate-fade-in">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={2}
                        className="w-full rounded-[var(--radius-sm)] border border-surface-border bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none resize-none"
                      />
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
