'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { relativeTime } from '@/lib/utils';
import { Card, CardTitle } from '@/components/ui/card';
import { PenLine, Battery, Trophy, Target, Users } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'log' | 'energy' | 'brag' | 'goal' | 'meeting';
  text: string;
  time: number;
}

const icons = {
  log: PenLine,
  energy: Battery,
  brag: Trophy,
  goal: Target,
  meeting: Users,
};

const colors = {
  log: 'text-accent',
  energy: 'text-energy-4',
  brag: 'text-warning',
  goal: 'text-success',
  meeting: 'text-accent-secondary',
};

export function RecentActivity() {
  const logs = useLiveQuery(
    () => db.workLogs.orderBy('createdAt').reverse().limit(3).toArray()
  );
  const energy = useLiveQuery(
    () => db.energyCheckins.orderBy('createdAt').reverse().limit(2).toArray()
  );
  const brags = useLiveQuery(
    () => db.bragDocuments.orderBy('createdAt').reverse().limit(2).toArray()
  );

  const items: ActivityItem[] = [
    ...(logs?.map((l) => ({
      id: `log-${l.id}`,
      type: 'log' as const,
      text: l.content.slice(0, 60) + (l.content.length > 60 ? '...' : ''),
      time: l.createdAt,
    })) ?? []),
    ...(energy?.map((e) => ({
      id: `energy-${e.id}`,
      type: 'energy' as const,
      text: `Battery check-in: ${e.level}/5`,
      time: e.createdAt,
    })) ?? []),
    ...(brags?.map((b) => ({
      id: `brag-${b.id}`,
      type: 'brag' as const,
      text: `Created: ${b.title}`,
      time: b.createdAt,
    })) ?? []),
  ]
    .sort((a, b) => b.time - a.time)
    .slice(0, 5);

  if (items.length === 0) return null;

  return (
    <Card>
      <CardTitle className="text-base mb-3">Recent Activity</CardTitle>
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = icons[item.type];
          return (
            <div key={item.id} className="flex items-center gap-3 py-1.5">
              <Icon size={12} className={colors[item.type]} />
              <span className="text-sm text-text-secondary flex-1 truncate">
                {item.text}
              </span>
              <span className="text-[10px] text-text-tertiary font-mono whitespace-nowrap">
                {relativeTime(item.time)}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
