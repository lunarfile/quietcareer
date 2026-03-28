'use client';
import { usePageTitle } from '@/hooks/use-page-title';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type MeetingType, type Frequency } from '@/lib/db';
import { generateId, now, todayISO } from '@/lib/utils';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import {
  Users,
  Plus,
  X,
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Calendar,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { format, parseISO, addDays, addWeeks, addMonths, isPast, differenceInDays } from 'date-fns';
import { getAIApiKey, getAIProvider, getAIModel, getUserRole } from '@/lib/settings';
import { AI_PROVIDERS, streamAIResponse, type AIProvider } from '@/lib/ai/providers';
import { meetingPrepPrompt } from '@/lib/ai/prompts';

const MEETING_TYPES: { value: MeetingType; label: string; emoji: string }[] = [
  { value: 'one-on-one', label: '1:1', emoji: '\u{1F91D}' },
  { value: 'skip-level', label: 'Skip-Level', emoji: '\u{1F4C8}' },
  { value: 'team-standup', label: 'Team', emoji: '\u{1F465}' },
  { value: 'review', label: 'Review', emoji: '\u{1F4CA}' },
  { value: 'other', label: 'Other', emoji: '\u{1F4AC}' },
];

const FREQ_OPTIONS: { value: Frequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

export default function MeetingsPage() {
  const { toast } = useToast();
  usePageTitle('Prep');
  const [showForm, setShowForm] = useState(false);
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [streamingPrep, setStreamingPrep] = useState('');
  const [copied, setCopied] = useState(false);

  // Form
  const [title, setTitle] = useState('');
  const [meetingType, setMeetingType] = useState<MeetingType>('one-on-one');
  const [frequency, setFrequency] = useState<Frequency>('biweekly');
  const [attendees, setAttendees] = useState('');
  const [nextDate, setNextDate] = useState('');

  const meetings = useLiveQuery(
    () => db.meetings.orderBy('createdAt').reverse().toArray()
  );

  const upcoming = meetings?.filter((m) => m.nextMeetingDate && !isPast(addDays(parseISO(m.nextMeetingDate), 1)))
    .sort((a, b) => (a.nextMeetingDate ?? '').localeCompare(b.nextMeetingDate ?? '')) ?? [];
  const past = meetings?.filter((m) => !m.nextMeetingDate || isPast(addDays(parseISO(m.nextMeetingDate), 1))) ?? [];

  const handleCreate = async () => {
    if (!title.trim()) return;

    await db.meetings.add({
      id: generateId(),
      title: title.trim(),
      type: meetingType,
      frequency,
      attendees: attendees.trim(),
      lastMeetingDate: null,
      nextMeetingDate: nextDate || null,
      prepNotes: '',
      actionItems: '[]',
      historicalNotes: '[]',
      createdAt: now(),
      updatedAt: now(),
    });

    setTitle('');
    setMeetingType('one-on-one');
    setFrequency('biweekly');
    setAttendees('');
    setNextDate('');
    setShowForm(false);
    toast('Meeting added. We\u2019ll help you prep.', 'success');
  };

  const handleGeneratePrep = async (meetingId: string) => {
    const meeting = meetings?.find((m) => m.id === meetingId);
    if (!meeting) return;

    setGeneratingFor(meetingId);
    setStreamingPrep('');
    setExpandedMeeting(meetingId);

    const provider = (await getAIProvider()) as AIProvider;
    const apiKey = await getAIApiKey();
    const model = await getAIModel();
    const role = (await getUserRole()) ?? 'professional';

    if (!apiKey) {
      toast('Set up your AI provider in Settings first.', 'error');
      setGeneratingFor(null);
      return;
    }

    // Get logs since last meeting (or last 14 days)
    const since = meeting.lastMeetingDate ?? format(addDays(new Date(), -14), 'yyyy-MM-dd');
    const logs = await db.workLogs.where('date').aboveOrEqual(since).toArray();

    if (logs.length === 0) {
      toast('No field notes since last meeting. Log some work first.', 'error');
      setGeneratingFor(null);
      return;
    }

    const entries = logs.map((l) => l.aiRewrite ?? l.content);
    const prevActions: string[] = JSON.parse(meeting.actionItems || '[]');
    const typeLabel = MEETING_TYPES.find((t) => t.value === meeting.type)?.label ?? meeting.type;

    const messages = meetingPrepPrompt(entries, typeLabel, meeting.attendees, role, prevActions);
    const config = AI_PROVIDERS[provider];

    await streamAIResponse(
      provider,
      apiKey,
      model ?? config.defaultModel,
      messages,
      {
        onChunk: (text) => setStreamingPrep((prev) => prev + text),
        onDone: async (fullText) => {
          await db.meetings.update(meetingId, {
            prepNotes: fullText,
            updatedAt: now(),
          });
          setGeneratingFor(null);
          toast('Briefing ready. You\u2019re prepared.', 'success');
        },
        onError: (err) => {
          setGeneratingFor(null);
          toast(`Prep failed: ${err.message}`, 'error');
        },
      }
    );
  };

  const handleCompleteMeeting = async (meetingId: string) => {
    const meeting = meetings?.find((m) => m.id === meetingId);
    if (!meeting) return;

    // Archive current prep to history
    const history: { date: string; notes: string; actionItems: string[] }[] = JSON.parse(meeting.historicalNotes || '[]');
    if (meeting.prepNotes) {
      history.unshift({
        date: todayISO(),
        notes: meeting.prepNotes,
        actionItems: JSON.parse(meeting.actionItems || '[]'),
      });
    }

    // Calculate next meeting date
    let nextMeetingDate: string | null = null;
    const baseDate = new Date();
    switch (meeting.frequency) {
      case 'weekly': nextMeetingDate = format(addWeeks(baseDate, 1), 'yyyy-MM-dd'); break;
      case 'biweekly': nextMeetingDate = format(addWeeks(baseDate, 2), 'yyyy-MM-dd'); break;
      case 'monthly': nextMeetingDate = format(addMonths(baseDate, 1), 'yyyy-MM-dd'); break;
      case 'quarterly': nextMeetingDate = format(addMonths(baseDate, 3), 'yyyy-MM-dd'); break;
    }

    await db.meetings.update(meetingId, {
      lastMeetingDate: todayISO(),
      nextMeetingDate,
      prepNotes: '',
      actionItems: '[]',
      historicalNotes: JSON.stringify(history),
      updatedAt: now(),
    });

    toast('Meeting done. Next one scheduled.', 'success');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this meeting?')) return;
    await db.meetings.delete(id);
    toast('Meeting removed.', 'success');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast('Copied to clipboard.', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const getDaysUntil = (dateStr: string | null) => {
    if (!dateStr) return null;
    const days = differenceInDays(parseISO(dateStr), new Date());
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 0) return 'Overdue';
    return `${days} days`;
  };

  const renderMeetingCard = (meeting: NonNullable<typeof meetings>[number]) => {
    const typeInfo = MEETING_TYPES.find((t) => t.value === meeting.type);
    const isExpanded = expandedMeeting === meeting.id;
    const isGenerating = generatingFor === meeting.id;
    const daysUntil = getDaysUntil(meeting.nextMeetingDate);
    const prepContent = isGenerating ? streamingPrep : meeting.prepNotes;
    const history: { date: string; notes: string }[] = JSON.parse(meeting.historicalNotes || '[]');

    return (
      <Card key={meeting.id} className="hover:border-surface-border-hover transition-all duration-150">
        <button
          onClick={() => setExpandedMeeting(isExpanded ? null : meeting.id)}
          className="w-full text-left"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">{typeInfo?.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-text-primary">{meeting.title}</p>
                <Badge variant="muted">{typeInfo?.label}</Badge>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {meeting.attendees && (
                  <span className="text-xs text-text-tertiary">{meeting.attendees}</span>
                )}
                {daysUntil && (
                  <Badge variant={daysUntil === 'Today' || daysUntil === 'Tomorrow' ? 'warning' : daysUntil === 'Overdue' ? 'danger' : 'default'}>
                    <Calendar size={8} /> {daysUntil}
                  </Badge>
                )}
              </div>
            </div>
            {meeting.prepNotes ? (
              <Badge variant="success">Prepped</Badge>
            ) : (
              <Badge variant="default">Needs prep</Badge>
            )}
            {isExpanded ? <ChevronUp size={14} className="text-text-tertiary" /> : <ChevronDown size={14} className="text-text-tertiary" />}
          </div>
        </button>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-surface-border animate-fade-in space-y-4">
            {/* Prep content */}
            {prepContent ? (
              <div>
                <p className="text-xs uppercase tracking-wider text-accent mb-2 flex items-center gap-1">
                  <Sparkles size={10} /> Your Briefing
                </p>
                <pre className="whitespace-pre-wrap text-sm text-text-primary font-sans leading-relaxed bg-bg-tertiary rounded-[var(--radius-md)] p-4">
                  {prepContent}
                  {isGenerating && (
                    <span className="inline-block w-0.5 h-4 bg-accent ml-0.5 animate-pulse-gentle" />
                  )}
                </pre>
                {!isGenerating && (
                  <div className="flex gap-2 mt-3">
                    <Button variant="ghost" size="sm" onClick={() => handleCopy(prepContent)}>
                      {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleGeneratePrep(meeting.id)}>
                      <RotateCcw size={12} /> Regenerate
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <Button onClick={() => handleGeneratePrep(meeting.id)} disabled={isGenerating}>
                {isGenerating ? (
                  <><Sparkles size={14} className="animate-spin" /> Preparing briefing...</>
                ) : (
                  <><Sparkles size={14} /> Generate Prep</>
                )}
              </Button>
            )}

            {/* Editable details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Attendees</label>
                <input
                  defaultValue={meeting.attendees}
                  placeholder="e.g., Sarah (Manager)"
                  onBlur={async (e) => {
                    if (e.target.value !== meeting.attendees) {
                      await db.meetings.update(meeting.id, { attendees: e.target.value, updatedAt: now() });
                    }
                  }}
                  className="w-full h-8 px-2 rounded-[var(--radius-sm)] border border-surface-border bg-bg-input text-xs text-text-primary focus:border-accent focus:outline-none"
                  aria-label="Meeting attendees"
                />
              </div>
              <div>
                <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Next Date</label>
                <input
                  type="date"
                  defaultValue={meeting.nextMeetingDate ?? ''}
                  onBlur={async (e) => {
                    if (e.target.value !== meeting.nextMeetingDate) {
                      await db.meetings.update(meeting.id, { nextMeetingDate: e.target.value || null, updatedAt: now() });
                    }
                  }}
                  className="w-full h-8 px-2 rounded-[var(--radius-sm)] border border-surface-border bg-bg-input text-xs text-text-primary focus:border-accent focus:outline-none"
                  aria-label="Next meeting date"
                />
              </div>
            </div>

            {/* Action items */}
            <div>
              <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Action Items</label>
              <textarea
                defaultValue={(() => {
                  try { return JSON.parse(meeting.actionItems || '[]').join('\n'); } catch { return ''; }
                })()}
                placeholder="One per line (auto-saves on blur)"
                rows={2}
                onBlur={async (e) => {
                  const items = e.target.value.split('\n').map((s: string) => s.trim()).filter(Boolean);
                  await db.meetings.update(meeting.id, { actionItems: JSON.stringify(items), updatedAt: now() });
                }}
                className="w-full rounded-[var(--radius-sm)] border border-surface-border bg-bg-input px-2 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none resize-none"
                aria-label="Meeting action items"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              <Button variant="secondary" size="sm" onClick={() => handleCompleteMeeting(meeting.id)}>
                <Check size={12} /> Meeting Done
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(meeting.id)} className="text-danger-text hover:text-danger">
                <Trash2 size={12} /> Delete
              </Button>
            </div>

            {/* History */}
            {history.length > 0 && (
              <div>
                <p className="text-xs text-text-tertiary uppercase tracking-wider mb-2">Past Briefings</p>
                <div className="space-y-2">
                  {history.slice(0, 3).map((h, i) => (
                    <div key={i} className="text-xs text-text-tertiary p-2 bg-surface-highlight rounded-[var(--radius-sm)]">
                      <span className="font-mono">{format(parseISO(h.date), 'MMM d')}</span>
                      <p className="mt-1 text-text-secondary line-clamp-2">{h.notes.slice(0, 150)}...</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        icon={Users}
        iconColor="text-accent-secondary"
        title="Prep"
        subtitle="Walk in ready."
        actions={
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? 'Cancel' : 'Add Meeting'}
          </Button>
        }
      />

      {/* Create form */}
      {showForm && (
        <Card className="animate-fade-up">
          <div className="flex flex-col gap-4">
            <Input
              id="meeting-title"
              label="Meeting name"
              placeholder="e.g., 1:1 with Sarah"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div>
              <label className="text-sm font-medium text-text-secondary mb-2 block">Type</label>
              <div className="flex flex-wrap gap-1.5">
                {MEETING_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setMeetingType(t.value)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-all ${
                      meetingType === t.value
                        ? 'border-accent bg-accent-muted text-accent-text'
                        : 'border-surface-border text-text-tertiary hover:border-surface-border-hover'
                    }`}
                  >
                    <span>{t.emoji}</span> {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">Frequency</label>
                <div className="flex flex-wrap gap-1.5">
                  {FREQ_OPTIONS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFrequency(f.value)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                        frequency === f.value
                          ? 'border-accent bg-accent-muted text-accent-text'
                          : 'border-surface-border text-text-secondary hover:border-surface-border-hover'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <Input
                id="next-date"
                label="Next meeting"
                type="date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
              />
            </div>

            <Input
              id="attendees"
              label="With (optional)"
              placeholder="e.g., Sarah (Manager)"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
            />

            <Button onClick={handleCreate} disabled={!title.trim()} className="self-start">
              Add Meeting
            </Button>
          </div>
        </Card>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success" />
            Upcoming ({upcoming.length})
          </h2>
          <div className="space-y-2">{upcoming.map(renderMeetingCard)}</div>
        </div>
      )}

      {/* Past / no date */}
      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-text-secondary mb-3">
            Other ({past.length})
          </h2>
          <div className="space-y-2">{past.map(renderMeetingCard)}</div>
        </div>
      )}

      {/* Empty */}
      {(!meetings || meetings.length === 0) && !showForm && (
        <EmptyState
          icon={Users}
          title="No meetings to prep for."
          description="Add your recurring 1:1s, skip-levels, or reviews. We'll pull your recent wins and build a briefing so you walk in ready."
          action={
            <Button onClick={() => setShowForm(true)}>
              <Plus size={14} /> Add Your First Meeting
            </Button>
          }
        />
      )}
    </div>
  );
}
