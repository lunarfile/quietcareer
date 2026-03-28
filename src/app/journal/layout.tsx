'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { PenLine, Download } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { exportWorkLogsToPDF } from '@/lib/pdf-export';
import { getUserRole } from '@/lib/settings';

const tabs = [
  { href: '/journal', label: 'Entries' },
  { href: '/journal/calendar', label: 'Calendar' },
  { href: '/journal/weekly', label: 'Weekly' },
  { href: '/journal/monthly', label: 'Monthly' },
];

export default function JournalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { toast } = useToast();
  const totalCount = useLiveQuery(() => db.workLogs.count());

  const handleExportPDF = async () => {
    const logs = await db.workLogs.orderBy('date').reverse().toArray();
    if (logs.length === 0) {
      toast('No entries to export.', 'error');
      return;
    }
    const role = (await getUserRole()) ?? 'Professional';
    const first = logs[logs.length - 1].date;
    const last = logs[0].date;
    await exportWorkLogsToPDF(
      logs.map((l) => ({
        date: l.date,
        content: l.content,
        aiRewrite: l.aiRewrite,
        impactType: l.impactType,
        project: l.project,
      })),
      role,
      `${first} to ${last}`
    );
    toast('PDF exported.', 'success');
  };

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        icon={PenLine}
        title="Field Notes"
        subtitle={`${totalCount ?? 0} proof points`}
        actions={
          (totalCount ?? 0) > 0 ? (
            <Button variant="ghost" size="sm" onClick={handleExportPDF}>
              <Download size={14} /> Export PDF
            </Button>
          ) : undefined
        }
      />

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 rounded-[var(--radius-md)] bg-bg-secondary border border-surface-border overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'px-4 py-2 text-sm rounded-[var(--radius-sm)] transition-all whitespace-nowrap',
                isActive
                  ? 'bg-surface-highlight text-text-primary font-medium'
                  : 'text-text-tertiary hover:text-text-secondary'
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
