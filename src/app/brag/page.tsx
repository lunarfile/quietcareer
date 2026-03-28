'use client';
import { usePageTitle } from '@/hooks/use-page-title';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { encryptBragDoc } from '@/lib/field-encryption';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type BragTemplate } from '@/lib/db';
import { generateId, now, todayISO } from '@/lib/utils';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { Trophy, FileText, Sparkles, Download, Copy, Check, ArrowRight } from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import { getAIApiKey, getAIProvider, getAIModel, getUserRole } from '@/lib/settings';
import { AI_PROVIDERS, streamAIResponse, type AIProvider } from '@/lib/ai/providers';
import { performanceReview, generateResumeBullets, oneOnOneTalkingPoints } from '@/lib/ai/prompts';
import { exportBragDocToPDF } from '@/lib/pdf-export';

const TEMPLATES: { value: BragTemplate; label: string; description: string; emoji: string }[] = [
  { value: 'performance-review', label: 'Performance Review', description: 'Self-assessment organized by theme', emoji: '\u{1F4CA}' },
  { value: 'resume-bullets', label: 'Resume Bullets', description: 'XYZ-format achievement bullets', emoji: '\u{1F4DD}' },
  { value: 'promotion-packet', label: 'Promotion Packet', description: 'Evidence for your next level', emoji: '\u{1F680}' },
  { value: '1on1-talking-points', label: '1:1 Talking Points', description: 'Prepared points for your manager', emoji: '\u{1F4AC}' },
  { value: 'linkedin-update', label: 'LinkedIn Update', description: 'Professional summary refresh', emoji: '\u{1F310}' },
];

export default function BragPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  usePageTitle('Proof');
  const [template, setTemplate] = useState<BragTemplate>('performance-review');
  const [dateRange, setDateRange] = useState(30);
  const [tone, setTone] = useState<'professional' | 'confident' | 'casual'>('professional');
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editDocContent, setEditDocContent] = useState('');

  const savedDocs = useLiveQuery(
    () => db.bragDocuments.orderBy('createdAt').reverse().limit(20).toArray()
  );

  const totalDocs = useLiveQuery(() => db.bragDocuments.count());
  const totalLogs = useLiveQuery(() => db.workLogs.count());

  const handleGenerate = async () => {
    const cutoff = format(subDays(new Date(), dateRange), 'yyyy-MM-dd');
    const logs = await db.workLogs.where('date').aboveOrEqual(cutoff).toArray();

    if (logs.length === 0) {
      toast('No work logs found in this date range. Log some work first.', 'error');
      return;
    }

    setGenerating(true);
    setGeneratedContent('');

    const provider = (await getAIProvider()) as AIProvider;
    const apiKey = await getAIApiKey();
    const model = await getAIModel();
    const role = (await getUserRole()) ?? 'professional';

    if (!apiKey) {
      toast('Set up your AI provider in Settings first.', 'error');
      setGenerating(false);
      return;
    }

    const entries = logs.map((l) => l.aiRewrite ?? l.content);
    const period = `last ${dateRange} days`;

    const toneInstruction = tone === 'confident'
      ? ' Use a direct, assertive tone. No hedging.'
      : tone === 'casual'
        ? ' Use a natural, conversational tone. Avoid corporate jargon.'
        : ' Use a polished, professional tone appropriate for corporate settings.';

    let messages;
    if (template === 'resume-bullets') {
      messages = generateResumeBullets(entries, role);
    } else if (template === '1on1-talking-points') {
      const latestEnergy = await db.energyCheckins.orderBy('createdAt').reverse().first();
      messages = oneOnOneTalkingPoints(entries, latestEnergy?.level ?? null, role);
    } else {
      messages = performanceReview(entries, role, period);
    }
    // Inject tone into system message
    if (messages[0]?.role === 'system') {
      messages[0].content += toneInstruction;
    }

    const config = AI_PROVIDERS[provider];

    await streamAIResponse(
      provider,
      apiKey,
      model ?? config.defaultModel,
      messages,
      {
        onChunk: (text) => setGeneratedContent((prev) => prev + text),
        onDone: async (fullText) => {
          setGenerating(false);

          const doc = await encryptBragDoc({
            id: generateId(),
            title: `${TEMPLATES.find((t) => t.value === template)?.label} \u2014 ${format(new Date(), 'MMM yyyy')}`,
            dateRangeStart: cutoff,
            dateRangeEnd: todayISO(),
            generatedContent: fullText,
            editedContent: '',
            templateUsed: template,
            includedLogIds: logs.map((l) => l.id),
            exportedAt: null,
            createdAt: now(),
            updatedAt: now(),
          });
          await db.bragDocuments.add(doc);

          toast('Proof generated and saved.', 'success');
        },
        onError: (error) => {
          setGenerating(false);
          toast(`Generation failed: ${error.message}`, 'error');
        },
      }
    );
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast('Copied to clipboard.', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = async (doc: (typeof savedDocs extends (infer T)[] | undefined ? T : never)) => {
    if (!doc) return;
    const role = (await getUserRole()) ?? 'Professional';
    await exportBragDocToPDF(doc, role);
    toast('PDF exported.', 'success');
  };

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        icon={Trophy}
        iconColor="text-warning"
        title="Proof"
        subtitle={`${totalDocs ?? 0} career assets from ${totalLogs ?? 0} field notes`}
      />

      {/* Generate card */}
      <Card>
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center shrink-0">
            <Sparkles size={18} className="text-accent" />
          </div>
          <div>
            <p className="text-base font-medium text-text-primary">Generate New Document</p>
            <p className="text-sm text-text-tertiary mt-0.5">
              AI turns your work logs into polished career documents.
            </p>
          </div>
        </div>

        {/* Template picker */}
        <div className="mb-5">
          <label className="text-sm font-medium text-text-secondary mb-2 block">
            Template
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTemplate(t.value)}
                className={`text-left p-3 rounded-[var(--radius-md)] border transition-all duration-150 ${
                  template === t.value
                    ? 'border-accent bg-accent-muted scale-[1.01]'
                    : 'border-surface-border hover:border-surface-border-hover'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>{t.emoji}</span>
                  <span className="text-sm font-medium text-text-primary">{t.label}</span>
                </div>
                <span className="text-xs text-text-tertiary">{t.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div className="mb-5">
          <label className="text-sm font-medium text-text-secondary mb-2 block">
            Time Period
          </label>
          <div className="flex gap-2">
            {[
              { days: 7, label: '7 days' },
              { days: 30, label: '30 days' },
              { days: 90, label: '90 days' },
              { days: 180, label: '6 months' },
              { days: 365, label: '1 year' },
            ].map(({ days, label }) => (
              <button
                key={days}
                onClick={() => setDateRange(days)}
                className={`px-3 py-1.5 text-sm rounded-full border transition-all duration-150 ${
                  dateRange === days
                    ? 'border-accent bg-accent-muted text-accent-text'
                    : 'border-surface-border text-text-secondary hover:border-surface-border-hover'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tone */}
        <div className="mb-5">
          <label className="text-sm font-medium text-text-secondary mb-2 block">Tone</label>
          <div className="flex gap-2">
            {([
              { value: 'professional' as const, label: 'Professional', desc: 'Polished, corporate-ready' },
              { value: 'confident' as const, label: 'Confident', desc: 'Direct, assertive' },
              { value: 'casual' as const, label: 'Casual', desc: 'Natural, conversational' },
            ]).map((t) => (
              <button
                key={t.value}
                onClick={() => setTone(t.value)}
                aria-label={`Tone: ${t.label}`}
                className={`flex-1 py-2 px-3 text-left rounded-[var(--radius-sm)] border transition-all ${
                  tone === t.value
                    ? 'border-accent bg-accent-muted'
                    : 'border-surface-border hover:border-surface-border-hover'
                }`}
              >
                <span className="text-xs font-medium text-text-primary block">{t.label}</span>
                <span className="text-[10px] text-text-tertiary">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <span className="flex items-center gap-2">
              <Sparkles size={14} className="animate-spin" /> Generating...
            </span>
          ) : (
            <>
              <Sparkles size={14} /> Generate <ArrowRight size={12} />
            </>
          )}
        </Button>
      </Card>

      {/* Streaming output */}
      {(generating || generatedContent) && (
        <Card variant="accent">
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="text-base">Generated Document</CardTitle>
            {generatedContent && !generating && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(generatedContent)}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            )}
          </div>
          <div className="relative">
            <pre className="whitespace-pre-wrap text-sm text-text-primary font-sans leading-relaxed">
              {generatedContent}
              {generating && (
                <span className="inline-block w-0.5 h-4 bg-accent ml-0.5 animate-pulse-gentle" />
              )}
            </pre>
          </div>
          <p className="text-[10px] text-text-tertiary/60 mt-3 italic">
            AI-generated draft. Review for accuracy before using in reviews or applications.
          </p>
        </Card>
      )}

      {/* Saved documents */}
      {savedDocs && savedDocs.length > 0 && (
        <div>
          <h2 className="text-base font-medium text-text-primary mb-3">Saved Documents</h2>
          <div className="space-y-2">
            {savedDocs.map((doc) => {
              const isExpanded = expandedDoc === doc.id;
              return (
                <Card
                  key={doc.id}
                  className="hover:border-surface-border-hover transition-all duration-150"
                >
                  <button
                    onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText size={16} className="text-accent shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {doc.title}
                          </p>
                          <p className="text-xs text-text-tertiary mt-0.5">
                            {format(parseISO(doc.dateRangeStart), 'MMM d')} \u2014{' '}
                            {format(parseISO(doc.dateRangeEnd), 'MMM d, yyyy')}
                            {' \u00B7 '}
                            {doc.includedLogIds.length} entries
                          </p>
                        </div>
                      </div>
                      <Badge variant="muted">{doc.templateUsed.replace('-', ' ')}</Badge>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-surface-border animate-fade-in">
                      {editingDocId === doc.id ? (
                        <div>
                          <textarea
                            value={editDocContent}
                            onChange={(e) => setEditDocContent(e.target.value)}
                            rows={10}
                            className="w-full rounded-[var(--radius-sm)] border border-surface-border bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none resize-y font-sans leading-relaxed"
                          />
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" onClick={async () => {
                              await db.bragDocuments.update(doc.id, { editedContent: editDocContent, updatedAt: now() });
                              setEditingDocId(null);
                              toast('Saved your edits.', 'success');
                            }}>
                              Save Edits
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingDocId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <pre className="whitespace-pre-wrap text-sm text-text-secondary font-sans leading-relaxed mb-4 max-h-64 overflow-y-auto">
                            {doc.editedContent || doc.generatedContent}
                          </pre>
                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setEditingDocId(doc.id);
                                setEditDocContent(doc.editedContent || doc.generatedContent);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleCopy(doc.editedContent || doc.generatedContent)}
                            >
                              <Copy size={12} /> Copy
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleExportPDF(doc)}
                            >
                              <Download size={12} /> PDF
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                const md = `# ${doc.title}\n\n*${doc.dateRangeStart} \u2014 ${doc.dateRangeEnd} | ${doc.includedLogIds.length} entries*\n\n${doc.editedContent || doc.generatedContent}`;
                                const blob = new Blob([md], { type: 'text/markdown' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${doc.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.md`;
                                a.click();
                                URL.revokeObjectURL(url);
                                toast('Markdown exported.', 'success');
                              }}
                            >
                              <Download size={12} /> MD
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                const ok = await confirm({ title: 'Delete document?', description: 'This proof document will be permanently removed.', confirmLabel: 'Delete', variant: 'danger' });
                                if (!ok) return;
                                await db.bragDocuments.delete(doc.id);
                                toast('Document removed.', 'success');
                              }}
                              className="text-text-tertiary hover:text-danger-text ml-auto"
                            >
                              Delete
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!savedDocs || savedDocs.length === 0) && !generatedContent && (
        <EmptyState
          icon={Trophy}
          title="No proof on file yet."
          description="That project you finished last month? The thing you fixed that nobody noticed? That's what goes here — before you forget it."
        />
      )}
    </div>
  );
}
