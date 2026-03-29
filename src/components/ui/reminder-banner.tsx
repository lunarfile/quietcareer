'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getActiveReminder,
  markStretchReminderShown,
  markLogReminderShown,
  markEnergyReminderShown,
  type Reminder,
} from '@/lib/reminders';
import { Button } from './button';
import { X, Heart, PenLine, Battery, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ReminderBanner() {
  const router = useRouter();
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [exerciseActive, setExerciseActive] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // Check for reminders every 30 seconds
  useEffect(() => {
    const check = () => {
      const r = getActiveReminder();
      if (r && !reminder) setReminder(r);
    };

    check(); // Check immediately
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [reminder]);

  const dismiss = useCallback(() => {
    if (!reminder) return;
    if (reminder.type === 'stretch') markStretchReminderShown();
    if (reminder.type === 'log-work') markLogReminderShown();
    if (reminder.type === 'energy-checkin') markEnergyReminderShown();
    setReminder(null);
    setExerciseActive(false);
  }, [reminder]);

  const handleAction = () => {
    if (reminder?.action) {
      dismiss();
      router.push(reminder.action.href);
    }
  };

  const startExercise = () => {
    if (!reminder?.exercise) return;
    setExerciseActive(true);
    const duration = parseInt(reminder.exercise.duration) || 60;
    setSeconds(duration);

    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(interval);
          markStretchReminderShown();
          setTimeout(() => {
            setExerciseActive(false);
            setReminder(null);
          }, 1500);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  if (!reminder) return null;

  const icons = {
    stretch: Heart,
    'log-work': PenLine,
    'energy-checkin': Battery,
  };
  const Icon = icons[reminder.type];

  // Exercise timer mode
  if (exerciseActive && reminder.exercise) {
    return (
      <div className="fixed top-14 left-4 right-4 z-50 md:left-auto md:right-6 md:w-96 animate-fade-up">
        <div className="bg-bg-secondary border border-accent/30 rounded-2xl shadow-lg p-5">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Timer size={16} className="text-accent" />
              <span className="text-3xl font-mono font-bold text-text-primary">{seconds}s</span>
            </div>
            <p className="text-sm font-medium text-text-primary mb-1">{reminder.exercise.name}</p>
            <p className="text-sm text-text-secondary leading-relaxed">{reminder.exercise.instruction}</p>
            {seconds === 0 && (
              <p className="text-sm text-success-text mt-3 animate-fade-in">Done. Nice reset.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Banner mode
  return (
    <div className="fixed top-14 left-4 right-4 z-50 md:left-auto md:right-6 md:w-96 animate-fade-up">
      <div className="bg-bg-secondary border border-surface-border rounded-2xl shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent-muted flex items-center justify-center shrink-0">
            <Icon size={16} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary">{reminder.title}</p>
            <p className="text-xs text-text-secondary mt-0.5">{reminder.body}</p>
            <div className="flex gap-2 mt-3">
              {reminder.type === 'stretch' && reminder.exercise && (
                <Button size="sm" onClick={startExercise}>
                  <Timer size={12} /> {reminder.exercise.duration} Reset
                </Button>
              )}
              {reminder.action && (
                <Button size="sm" onClick={handleAction}>
                  {reminder.action.label}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={dismiss}>
                Later
              </Button>
            </div>
          </div>
          <button onClick={dismiss} className="text-text-tertiary active:text-text-primary" aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
