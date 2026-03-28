'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import { Search, PenLine, Trophy, Target, Users, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface SearchResult {
  id: string;
  type: 'field-note' | 'proof' | 'goal' | 'meeting';
  title: string;
  subtitle: string;
  href: string;
  icon: typeof PenLine;
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }

    const lower = q.toLowerCase();
    const found: SearchResult[] = [];

    // Search work logs
    const logs = await db.workLogs.toArray();
    logs
      .filter((l) => l.content.toLowerCase().includes(lower) || l.project.toLowerCase().includes(lower))
      .slice(0, 5)
      .forEach((l) => {
        found.push({
          id: l.id,
          type: 'field-note',
          title: l.content.slice(0, 80) + (l.content.length > 80 ? '...' : ''),
          subtitle: `${format(parseISO(l.date), 'MMM d')} \u00B7 ${l.impactType}`,
          href: '/journal',
          icon: PenLine,
        });
      });

    // Search brag docs
    const docs = await db.bragDocuments.toArray();
    docs
      .filter((d) => d.title.toLowerCase().includes(lower) || d.generatedContent.toLowerCase().includes(lower))
      .slice(0, 3)
      .forEach((d) => {
        found.push({
          id: d.id,
          type: 'proof',
          title: d.title,
          subtitle: `${format(parseISO(d.dateRangeStart), 'MMM d')} \u2014 ${format(parseISO(d.dateRangeEnd), 'MMM d')}`,
          href: '/brag',
          icon: Trophy,
        });
      });

    // Search goals
    const goals = await db.goals.toArray();
    goals
      .filter((g) => g.title.toLowerCase().includes(lower) || g.notes.toLowerCase().includes(lower))
      .slice(0, 3)
      .forEach((g) => {
        found.push({
          id: g.id,
          type: 'goal',
          title: g.title,
          subtitle: `${g.status} \u00B7 ${g.progress}%`,
          href: '/goals',
          icon: Target,
        });
      });

    // Search meetings
    const meetings = await db.meetings.toArray();
    meetings
      .filter((m) => m.title.toLowerCase().includes(lower) || m.attendees.toLowerCase().includes(lower))
      .slice(0, 3)
      .forEach((m) => {
        found.push({
          id: m.id,
          type: 'meeting',
          title: m.title,
          subtitle: m.attendees || m.type,
          href: '/meetings',
          icon: Users,
        });
      });

    setResults(found);
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    if (query) {
      const timer = setTimeout(() => search(query), 150);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
    }
  }, [query, search]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        setOpen(true);
        setQuery('');
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      router.push(results[selectedIndex].href);
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} />

      <div className="relative w-full max-w-lg mx-4 bg-bg-secondary border border-surface-border rounded-[var(--radius-lg)] shadow-lg overflow-hidden animate-fade-up">
        <div className="flex items-center gap-3 px-4 border-b border-surface-border">
          <Search size={16} className="text-text-tertiary shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search field notes, proof, goals, meetings..."
            className="flex-1 h-12 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
          />
          <button onClick={() => setOpen(false)} className="text-text-tertiary hover:text-text-primary" aria-label="Close search">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto py-2">
          {query.length >= 2 && results.length === 0 && (
            <p className="px-4 py-8 text-sm text-text-tertiary text-center">No results for &ldquo;{query}&rdquo;</p>
          )}

          {results.map((result, i) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => { router.push(result.href); setOpen(false); }}
              onMouseEnter={() => setSelectedIndex(i)}
              className={cn(
                'flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors',
                i === selectedIndex ? 'bg-surface-highlight' : ''
              )}
            >
              <result.icon size={14} className={i === selectedIndex ? 'text-accent' : 'text-text-tertiary'} />
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm truncate', i === selectedIndex ? 'text-text-primary' : 'text-text-secondary')}>
                  {result.title}
                </p>
                <p className="text-[10px] text-text-tertiary">{result.subtitle}</p>
              </div>
            </button>
          ))}

          {query.length < 2 && (
            <p className="px-4 py-6 text-xs text-text-tertiary text-center">
              Type at least 2 characters to search across all your data.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
