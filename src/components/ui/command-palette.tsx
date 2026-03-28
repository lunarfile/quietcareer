'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Search,
  PenLine,
  Battery,
  Trophy,
  Rocket,
  Target,
  Users,
  BarChart3,
  Settings,
  LayoutDashboard,
} from 'lucide-react';

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  icon: typeof Search;
  action: () => void;
  section: string;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    { id: 'dashboard', label: 'Go to My Week', icon: LayoutDashboard, action: () => router.push('/dashboard'), section: 'Navigate', shortcut: 'Ctrl+D' },
    { id: 'journal', label: 'Write a Field Note', icon: PenLine, action: () => router.push('/journal'), section: 'Actions', shortcut: 'Ctrl+N' },
    { id: 'energy', label: 'Battery Check-in', icon: Battery, action: () => router.push('/energy'), section: 'Actions', shortcut: 'Ctrl+E' },
    { id: 'proof', label: 'Generate Proof', icon: Trophy, action: () => router.push('/brag'), section: 'Actions' },
    { id: 'meetings', label: 'Prep for Meeting', icon: Users, action: () => router.push('/meetings'), section: 'Navigate' },
    { id: 'snapshot', label: 'Weekly Snapshot', icon: BarChart3, action: () => router.push('/snapshot'), section: 'Navigate' },
    { id: 'runway', label: 'Check Runway', icon: Rocket, action: () => router.push('/escape'), section: 'Navigate' },
    { id: 'goals', label: 'Next Moves', icon: Target, action: () => router.push('/goals'), section: 'Navigate' },
    { id: 'settings', label: 'Settings', icon: Settings, action: () => router.push('/settings'), section: 'Navigate' },
    { id: 'calendar', label: 'Journal Calendar', icon: PenLine, action: () => router.push('/journal/calendar'), section: 'Navigate' },
  ];

  const filtered = query
    ? commands.filter((c) =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.section.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery('');
        setSelectedIndex(0);
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
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      filtered[selectedIndex].action();
      setOpen(false);
    }
  };

  if (!open) return null;

  const sections = [...new Set(filtered.map((c) => c.section))];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="relative w-full max-w-lg mx-4 bg-bg-secondary border border-surface-border rounded-[var(--radius-lg)] shadow-lg overflow-hidden animate-fade-up">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-surface-border">
          <Search size={16} className="text-text-tertiary shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 h-12 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-surface-highlight text-text-tertiary border border-surface-border">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto py-2">
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-sm text-text-tertiary text-center">
              No commands found.
            </p>
          )}

          {sections.map((section) => (
            <div key={section}>
              <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                {section}
              </p>
              {filtered
                .filter((c) => c.section === section)
                .map((cmd) => {
                  const globalIndex = filtered.indexOf(cmd);
                  const isSelected = globalIndex === selectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => {
                        cmd.action();
                        setOpen(false);
                      }}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className={cn(
                        'flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors',
                        isSelected ? 'bg-surface-highlight' : 'hover:bg-surface-highlight/50'
                      )}
                    >
                      <cmd.icon size={16} className={isSelected ? 'text-accent' : 'text-text-tertiary'} />
                      <span className={cn('text-sm flex-1', isSelected ? 'text-text-primary' : 'text-text-secondary')}>
                        {cmd.label}
                      </span>
                      {cmd.shortcut && (
                        <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-tertiary">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
