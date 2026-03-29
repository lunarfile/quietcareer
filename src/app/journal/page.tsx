'use client';
import { usePageTitle } from '@/hooks/use-page-title';
import { scheduleBackup } from '@/lib/auto-backup';

import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ImpactType } from '@/lib/db';
import { generateId, now, todayISO, relativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { copy } from '@/lib/copy';
import { Highlight } from '@/components/ui/highlight';
import { encryptWorkLog, decryptWorkLogs } from '@/lib/field-encryption';
import {
  PenLine,
  Sparkles,
  Search,
  ChevronDown,
  Pin,
  Trash2,
  Edit3,
  Copy,
} from 'lucide-react';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { getAIApiKey, getAIProvider, getAIModel, getUserRole } from '@/lib/settings';
import { AI_PROVIDERS, streamAIResponse, type AIProvider } from '@/lib/ai/providers';
import { rewriteAsImpact } from '@/lib/ai/prompts';

const IMPACT_QUICK: { value: ImpactType; emoji: string }[] = [
  { value: 'shipped', emoji: '\u{1F680}' },
  { value: 'improved', emoji: '\u{2728}' },
  { value: 'fixed', emoji: '\u{1F527}' },
  { value: 'led', emoji: '\u{1F451}' },
  { value: 'other', emoji: '\u{1F4CC}' },
];

const TEMPLATES = [
  'Led a meeting about ',
  'Fixed a bug in ',
  'Shipped ',
  'Helped a teammate with ',
  'Presented ',
];

export default function JournalPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  usePageTitle('Field Notes');

  // Form state
  const [content, setContent] = useState('');
  const [impactType, setImpactType] = useState<ImpactType>('other');
  const [saving, setSaving] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [project, setProject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Detail sheet
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editing, setEditing] = useState(false);
  const [rewritingId, setRewritingId] = useState<string | null>(null);

  // Data
  const rawLogs = useLiveQuery(
    () => db.workLogs.orderBy('createdAt').reverse().limit(50).toArray()
  );
  const [logs, setLogs] = useState(rawLogs);
  const totalCount = useLiveQuery(() => db.workLogs.count());

  useEffect(() => {
    if (!rawLogs) return;
    decryptWorkLogs(rawLogs).then(setLogs);
  }, [rawLogs]);

  // Submit
  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSaving(true);

    const entry = await encryptWorkLog({
      id: generateId(),
      date: todayISO(),
      content: content.trim(),
      tags: [],
      impactType,
      project: project.trim(),
      aiRewrite: null,
      mood: null,
      isPrivate: false,
      isPinned: false,
      createdAt: now(),
      updatedAt: now(),
    });
    await db.workLogs.add(entry);

    setContent('');
    setProject('');
    setImpactType('other');
    setShowMore(false);
    setSaving(false);
    toast(copy.entryToast(), 'success');
    scheduleBackup();
  };

  // AI Rewrite
  const handleRewrite = async (logId: string, logContent: string) => {
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

    await streamAIResponse(provider, apiKey, model ?? config.defaultModel, messages, {
      onChunk: (text) => { fullText += text; },
      onDone: async (finalText) => {
        await db.workLogs.update(logId, { aiRewrite: finalText, updatedAt: now() });
        setRewritingId(null);
        toast('Impact statement generated.', 'success');
        scheduleBackup();
      },
      onError: (err) => {
        setRewritingId(null);
        toast(`Failed: ${err.message}`, 'error');
      },
    });
  };

  // Delete
  const handleDelete = async (logId: string) => {
    const ok = await confirm({ title: 'Delete entry?', description: 'This cannot be undone.', confirmLabel: 'Delete', variant: 'danger' });
    if (!ok) return;
    await db.workLogs.delete(logId);
    setSelectedLog(null);
    toast('Entry removed.', 'success');
    scheduleBackup();
  };

  // Pin
  const handlePin = async (logId: string, pinned: boolean) => {
    await db.workLogs.update(logId, { isPinned: !pinned, updatedAt: now() });
    toast(pinned ? 'Unpinned.' : 'Pinned.', 'success');
  };

  // Save edit
  const handleSaveEdit = async (logId: string) => {
    if (!editContent.trim()) return;
    await db.workLogs.update(logId, { content: editContent.trim(), updatedAt: now() });
    setEditing(false);
    toast('Updated.', 'success');
    scheduleBackup();
  };

  // Filter + sort (pinned first)
  const filteredLogs = (logs ?? [])
    .filter((log) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return log.content.toLowerCase().includes(q) || log.project.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.createdAt - a.createdAt;
    });

  // Group by date
  const grouped: Record<string, typeof filteredLogs> = {};
  filteredLogs.forEach((log) => {
    if (!grouped[log.date]) grouped[log.date] = [];
    grouped[log.date].push(log);
  });

  const formatDate = (d: string) => {
    const date = parseISO(d);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEE, MMM d');
  };

  // Selected log for detail sheet
  const detailLog = selectedLog ? (logs ?? []).find((l) => l.id === selectedLog) : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Field Notes</h1>
        <p className="text-xs text-text-tertiary">{totalCount ?? 0} proof points</p>
      </div>

      {/* Write area — always visible */}
      <div className="bg-bg-secondary border border-surface-border rounded-xl p-4">
        <Textarea
          id="content"
          placeholder="What actually happened at work today?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
        />

        {/* Templates when empty */}
        {!content && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {TEMPLATES.map((t) => (
              <button
                key={t}
                onClick={() => setContent(t)}
                className="px-2.5 py-1 text-xs rounded-full border border-surface-border text-text-tertiary hover:border-accent/50 transition-all"
              >
                {t}...
              </button>
            ))}
          </div>
        )}

        {/* Impact type + more details */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-1">
            {IMPACT_QUICK.map((t) => (
              <button
                key={t.value}
                onClick={() => setImpactType(t.value)}
                className={`w-8 h-8 rounded-full text-sm transition-all ${
                  impactType === t.value
                    ? 'bg-accent-muted ring-1 ring-accent scale-110'
                    : 'opacity-40 hover:opacity-70'
                }`}
              >
                {t.emoji}
              </button>
            ))}
            <button
              onClick={() => setShowMore(!showMore)}
              className="w-8 h-8 rounded-full text-text-tertiary hover:text-text-secondary flex items-center justify-center"
            >
              <ChevronDown size={14} className={`transition-transform ${showMore ? 'rotate-180' : ''}`} />
            </button>
          </div>
          <Button size="sm" onClick={handleSubmit} disabled={!content.trim() || saving}>
            {saving ? '...' : 'Save'}
          </Button>
        </div>

        {/* More details (hidden by default) */}
        {showMore && (
          <div className="mt-3 pt-3 border-t border-surface-border animate-fade-in">
            <input
              placeholder="Project name (optional)"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="w-full h-9 px-3 rounded-[var(--radius-sm)] border border-surface-border bg-bg-input text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Search (only when > 5 entries) */}
      {(totalCount ?? 0) > 5 && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search field notes"
            className="w-full h-9 pl-9 pr-3 rounded-full border border-surface-border bg-bg-input text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />
        </div>
      )}

      {/* Entry list — minimal rows */}
      {Object.keys(grouped).length === 0 && (totalCount ?? 0) === 0 && (
        <EmptyState
          icon={PenLine}
          title="Nothing here yet. That's fine."
          description="Your first entry doesn't need to be good. Just write what happened today."
        />
      )}

      {Object.entries(grouped).map(([date, entries]) => (
        <div key={date}>
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2">
            {formatDate(date)}
          </p>
          <div className="space-y-0.5">
            {entries!.map((log) => (
              <button
                key={log.id}
                onClick={() => { setSelectedLog(log.id); setEditing(false); }}
                className="flex items-start gap-3 py-3 w-full text-left rounded-lg -mx-1 px-1 active:bg-surface-highlight transition-colors"
              >
                <span className="text-sm mt-0.5 shrink-0">
                  {IMPACT_QUICK.find((t) => t.value === log.impactType)?.emoji ?? '\u{1F4CC}'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary leading-relaxed line-clamp-2">
                    <Highlight text={log.content} query={searchQuery} />
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {log.project && <span className="text-[10px] text-accent">{log.project}</span>}
                    {log.isPinned && <Pin size={8} className="text-accent" />}
                    <span className="text-[10px] text-text-tertiary">{relativeTime(log.createdAt)}</span>
                  </div>
                </div>
                {log.aiRewrite && <Sparkles size={10} className="text-accent mt-1.5 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Entry detail bottom sheet */}
      <BottomSheet
        open={!!detailLog}
        onClose={() => setSelectedLog(null)}
        title={detailLog ? formatDate(detailLog.date) : ''}
      >
        {detailLog && (
          <div className="space-y-4 pb-4">
            {/* Impact + time */}
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {IMPACT_QUICK.find((t) => t.value === detailLog.impactType)?.emoji}
              </span>
              <span className="text-xs text-text-tertiary">
                {format(new Date(detailLog.createdAt), 'h:mm a')}
              </span>
              {detailLog.isPinned && (
                <span className="text-[10px] text-accent">Pinned</span>
              )}
            </div>

            {/* Content (editable) */}
            {editing ? (
              <div>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-surface-border bg-bg-input px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none resize-none"
                />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => handleSaveEdit(detailLog.id)}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="text-base text-text-primary leading-relaxed">{detailLog.content}</p>
            )}

            {/* AI rewrite */}
            {detailLog.aiRewrite && (
              <div className="pl-3 border-l-2 border-accent/50">
                <p className="text-[10px] text-accent uppercase tracking-wider mb-1">Impact version</p>
                <p className="text-sm text-accent-text/80 leading-relaxed">{detailLog.aiRewrite}</p>
              </div>
            )}

            {/* Meta */}
            {detailLog.project && (
              <p className="text-xs text-text-secondary">Project: {detailLog.project}</p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-surface-border">
              {!detailLog.aiRewrite && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleRewrite(detailLog.id, detailLog.content)}
                  disabled={rewritingId === detailLog.id}
                >
                  <Sparkles size={12} />
                  {rewritingId === detailLog.id ? 'Writing...' : 'AI Impact'}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setEditing(true); setEditContent(detailLog.content); }}
              >
                <Edit3 size={12} /> Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handlePin(detailLog.id, detailLog.isPinned)}
              >
                <Pin size={12} /> {detailLog.isPinned ? 'Unpin' : 'Pin'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(detailLog.aiRewrite ?? detailLog.content);
                  toast('Copied.', 'success');
                }}
              >
                <Copy size={12} /> Copy
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-danger-text"
                onClick={() => handleDelete(detailLog.id)}
              >
                <Trash2 size={12} /> Delete
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
