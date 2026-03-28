/**
 * CSV export utilities.
 */

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportToCSV(
  headers: string[],
  rows: string[][],
  filename: string
): void {
  const csv = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportWorkLogsCSV(): Promise<void> {
  const { db } = await import('./db');
  const logs = await db.workLogs.orderBy('date').reverse().toArray();

  exportToCSV(
    ['Date', 'Content', 'AI Rewrite', 'Project', 'Impact Type', 'Tags', 'Mood'],
    logs.map((l) => [
      l.date,
      l.content,
      l.aiRewrite ?? '',
      l.project,
      l.impactType,
      l.tags.join('; '),
      l.mood?.toString() ?? '',
    ]),
    `quietcareer-field-notes-${new Date().toISOString().split('T')[0]}.csv`
  );
}

export async function exportEnergyCSV(): Promise<void> {
  const { db } = await import('./db');
  const checkins = await db.energyCheckins.orderBy('date').reverse().toArray();

  exportToCSV(
    ['Date', 'Level', 'Notes', 'Suggested Mode'],
    checkins.map((c) => [
      c.date,
      c.level.toString(),
      c.notes,
      c.suggestedMode ?? '',
    ]),
    `quietcareer-energy-${new Date().toISOString().split('T')[0]}.csv`
  );
}

export async function exportAllCSV(): Promise<void> {
  await exportWorkLogsCSV();
  // Small delay so browser doesn't block multiple downloads
  await new Promise((r) => setTimeout(r, 500));
  await exportEnergyCSV();
}
