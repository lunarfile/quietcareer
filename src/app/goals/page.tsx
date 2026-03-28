'use client';
import { usePageTitle } from '@/hooks/use-page-title';
import { useConfirm } from '@/components/ui/confirm-dialog';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type GoalCategory, type GoalStatus } from '@/lib/db';
import { generateId, now } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import {
  Target,
  Plus,
  ChevronDown,
  ChevronUp,
  Check,
  Pause,
  Trash2,
  X,
} from 'lucide-react';
import { Confetti } from '@/components/ui/confetti';
import { format, parseISO } from 'date-fns';

const CATEGORIES: { value: GoalCategory; label: string; emoji: string }[] = [
  { value: 'skill', label: 'Skill', emoji: '\u{1F4DA}' },
  { value: 'role', label: 'Role Change', emoji: '\u{1F451}' },
  { value: 'financial', label: 'Financial', emoji: '\u{1F4B0}' },
  { value: 'escape', label: 'Escape Plan', emoji: '\u{1F6AA}' },
  { value: 'side-project', label: 'Side Project', emoji: '\u{1F680}' },
  { value: 'network', label: 'Networking', emoji: '\u{1F91D}' },
  { value: 'health', label: 'Health', emoji: '\u{1F49A}' },
  { value: 'other', label: 'Other', emoji: '\u{1F4CC}' },
];

const STATUS_COLORS: Record<GoalStatus, string> = {
  active: 'success',
  completed: 'accent',
  paused: 'warning',
  abandoned: 'muted',
};

export default function GoalsPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  usePageTitle('Next Moves');
  const [showForm, setShowForm] = useState(false);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<GoalCategory>('skill');
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');

  const goals = useLiveQuery(
    () => db.goals.orderBy('createdAt').reverse().toArray()
  );

  const activeGoals = goals?.filter((g) => g.status === 'active') ?? [];
  const completedGoals = goals?.filter((g) => g.status === 'completed') ?? [];
  const otherGoals = goals?.filter((g) => g.status === 'paused' || g.status === 'abandoned') ?? [];

  const handleCreate = async () => {
    if (!title.trim()) return;

    await db.goals.add({
      id: generateId(),
      title: title.trim(),
      category,
      targetDate: targetDate || null,
      status: 'active',
      progress: 0,
      milestones: '[]',
      notes: notes.trim(),
      linkedLogIds: [],
      createdAt: now(),
      updatedAt: now(),
    });

    setTitle('');
    setCategory('skill');
    setTargetDate('');
    setNotes('');
    setShowForm(false);
    toast('Goal created.', 'success');
  };

  const handleUpdateProgress = async (id: string, progress: number) => {
    const newProgress = Math.min(100, Math.max(0, progress));
    const status: GoalStatus = newProgress >= 100 ? 'completed' : 'active';
    await db.goals.update(id, { progress: newProgress, status, updatedAt: now() });
    if (status === 'completed') {
      toast('Done. You did that.', 'success');
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
    }
  };

  const handleUpdateStatus = async (id: string, status: GoalStatus) => {
    await db.goals.update(id, { status, updatedAt: now() });
    toast(`Goal ${status}.`, 'success');
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: 'Delete goal?', description: 'This goal and its progress will be permanently removed.', confirmLabel: 'Delete', variant: 'danger' });
    if (!ok) return;
    await db.goals.delete(id);
    toast('Goal deleted.', 'success');
  };

  const renderGoalCard = (goal: NonNullable<typeof goals>[number]) => {
    const catInfo = CATEGORIES.find((c) => c.value === goal.category);
    const isExpanded = expandedGoal === goal.id;

    return (
      <Card
        key={goal.id}
        className="group hover:border-surface-border-hover transition-all duration-150"
      >
        <button
          onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}
          className="w-full text-left"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">{catInfo?.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`text-sm font-medium ${goal.status === 'completed' ? 'text-text-tertiary line-through' : 'text-text-primary'}`}>
                  {goal.title}
                </p>
                <Badge variant={STATUS_COLORS[goal.status] as 'success' | 'accent' | 'warning' | 'muted'}>
                  {goal.status}
                </Badge>
              </div>
              {goal.targetDate && (
                <p className="text-xs text-text-tertiary mt-0.5">
                  Target: {format(parseISO(goal.targetDate), 'MMM d, yyyy')}
                </p>
              )}
            </div>

            {/* Progress bar */}
            <div className="w-20 shrink-0">
              <div className="h-1.5 rounded-full bg-surface-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
              <p className="text-[10px] text-text-tertiary text-right mt-0.5">
                {goal.progress}%
              </p>
            </div>

            {isExpanded ? <ChevronUp size={14} className="text-text-tertiary" /> : <ChevronDown size={14} className="text-text-tertiary" />}
          </div>
        </button>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-surface-border animate-fade-in space-y-4">
            {/* Editable notes */}
            <textarea
              defaultValue={goal.notes}
              placeholder="Add notes... (auto-saves on blur)"
              onBlur={async (e) => {
                const newNotes = e.target.value.trim();
                if (newNotes !== goal.notes) {
                  await db.goals.update(goal.id, { notes: newNotes, updatedAt: now() });
                }
              }}
              rows={2}
              className="w-full rounded-[var(--radius-sm)] border border-surface-border bg-bg-input px-3 py-2 text-sm text-text-secondary placeholder:text-text-tertiary focus:border-accent focus:outline-none resize-none"
            />

            {/* Progress slider */}
            {goal.status === 'active' && (
              <div>
                <label className="text-xs text-text-tertiary block mb-1">Progress</label>
                <input
                  type="range"
                  aria-label={`Progress for ${goal.title}`}
                  min={0}
                  max={100}
                  step={5}
                  value={goal.progress}
                  onChange={(e) => handleUpdateProgress(goal.id, parseInt(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none bg-surface-border accent-accent cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-text-tertiary mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              {goal.status === 'active' && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleUpdateProgress(goal.id, 100)}
                  >
                    <Check size={12} /> Complete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUpdateStatus(goal.id, 'paused')}
                  >
                    <Pause size={12} /> Pause
                  </Button>
                </>
              )}
              {goal.status === 'paused' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleUpdateStatus(goal.id, 'active')}
                >
                  Resume
                </Button>
              )}
              {goal.status === 'completed' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUpdateStatus(goal.id, 'active')}
                >
                  Reopen
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(goal.id)}
                className="text-danger-text hover:text-danger"
              >
                <Trash2 size={12} /> Delete
              </Button>
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="animate-fade-up space-y-6">
      <Confetti trigger={showConfetti} />
      <PageHeader
        icon={Target}
        iconColor="text-success"
        title="Next Moves"
        subtitle={`${activeGoals.length} active`}
        actions={
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? 'Cancel' : 'New Goal'}
          </Button>
        }
      />

      {/* Create form */}
      {showForm && (
        <Card className="animate-fade-up">
          <div className="flex flex-col gap-4">
            <Input
              id="goal-title"
              label="What's your goal?"
              placeholder="e.g., Get promoted to Senior Engineer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div>
              <label className="text-sm font-medium text-text-secondary mb-2 block">
                Category
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-all ${
                      category === c.value
                        ? 'border-accent bg-accent-muted text-accent-text'
                        : 'border-surface-border text-text-tertiary hover:border-surface-border-hover'
                    }`}
                  >
                    <span>{c.emoji}</span> {c.label}
                  </button>
                ))}
              </div>
            </div>

            <Input
              id="target-date"
              label="Target date (optional)"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />

            <Textarea
              id="goal-notes"
              label="Notes (optional)"
              placeholder="Why this matters, key milestones, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />

            <Button onClick={handleCreate} disabled={!title.trim()} className="self-start">
              Create Goal
            </Button>
          </div>
        </Card>
      )}

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success" />
            Active ({activeGoals.length})
          </h2>
          <div className="space-y-2">
            {activeGoals.map(renderGoalCard)}
          </div>
        </div>
      )}

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent" />
            Completed ({completedGoals.length})
          </h2>
          <div className="space-y-2">
            {completedGoals.map(renderGoalCard)}
          </div>
        </div>
      )}

      {/* Paused/abandoned */}
      {otherGoals.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-text-secondary mb-3">
            Paused / Archived ({otherGoals.length})
          </h2>
          <div className="space-y-2">
            {otherGoals.map(renderGoalCard)}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!goals || goals.length === 0) && !showForm && (
        <EmptyState
          icon={Target}
          title="No moves planned yet."
          description="You don't need a five-year plan. Even 'update my resume' or 'have one honest conversation' counts. Start with one."
          action={
            <Button onClick={() => setShowForm(true)}>
              <Plus size={14} /> Create Goal
            </Button>
          }
        />
      )}
    </div>
  );
}
