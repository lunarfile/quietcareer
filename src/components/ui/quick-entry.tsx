'use client';

import { useEffect, useState, useRef } from 'react';
import { db, type ImpactType } from '@/lib/db';
import { generateId, now, todayISO } from '@/lib/utils';
import { useToast } from './toast';
import { copy } from '@/lib/copy';
import { Button } from './button';
import { X, Sparkles } from 'lucide-react';

const IMPACT_QUICK = [
  { value: 'shipped' as ImpactType, label: '\u{1F680} Shipped' },
  { value: 'fixed' as ImpactType, label: '\u{1F527} Fixed' },
  { value: 'led' as ImpactType, label: '\u{1F451} Led' },
  { value: 'learned' as ImpactType, label: '\u{1F4DA} Learned' },
  { value: 'other' as ImpactType, label: '\u{1F4CC} Other' },
];

export function QuickEntry() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [impactType, setImpactType] = useState<ImpactType>('other');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        // Don't open if already on journal page
        if (window.location.pathname.startsWith('/journal')) return;
        setOpen(true);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);

    await db.workLogs.add({
      id: generateId(),
      date: todayISO(),
      content: content.trim(),
      tags: [],
      impactType,
      project: '',
      aiRewrite: null,
      mood: null,
      isPrivate: false,
      isPinned: false,
      createdAt: now(),
      updatedAt: now(),
    });

    toast(copy.entryToast(), 'success');
    setContent('');
    setImpactType('other');
    setSaving(false);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-bg-secondary border border-surface-border rounded-[var(--radius-lg)] shadow-lg animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-accent" />
            <span className="text-sm font-medium text-text-primary">Quick Field Note</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-text-tertiary hover:text-text-primary transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What happened at work? One sentence is enough."
            rows={3}
            className="w-full rounded-[var(--radius-sm)] border border-surface-border bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none resize-none"
          />

          {/* Quick impact type */}
          <div className="flex gap-1.5">
            {IMPACT_QUICK.map((t) => (
              <button
                key={t.value}
                onClick={() => setImpactType(t.value)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                  impactType === t.value
                    ? 'border-accent bg-accent-muted text-accent-text'
                    : 'border-surface-border text-text-tertiary hover:border-surface-border-hover'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border">
          <span className="text-[10px] text-text-tertiary">
            <kbd className="px-1 py-0.5 rounded bg-surface-highlight text-[9px]">Ctrl+Enter</kbd> to save
          </span>
          <Button size="sm" onClick={handleSave} disabled={!content.trim() || saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
