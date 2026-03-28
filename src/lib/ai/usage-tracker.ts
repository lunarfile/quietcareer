/**
 * AI usage tracking — stores token counts and estimated costs per day.
 * Data stored in localStorage (lightweight, no DB needed).
 */

interface DailyUsage {
  date: string;
  inputTokens: number;
  outputTokens: number;
  requests: number;
  estimatedCost: number;
}

const STORAGE_KEY = 'qc_ai_usage';

function getUsageHistory(): DailyUsage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUsageHistory(history: DailyUsage[]): void {
  // Keep last 90 days
  const cutoff = 90;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-cutoff)));
}

export function trackUsage(inputTokens: number, outputTokens: number): void {
  const today = new Date().toISOString().split('T')[0];
  const history = getUsageHistory();
  const existing = history.find((h) => h.date === today);

  // Rough cost estimates (varies by provider, these are ballpark)
  const inputCost = (inputTokens / 1000) * 0.003;
  const outputCost = (outputTokens / 1000) * 0.015;
  const cost = inputCost + outputCost;

  if (existing) {
    existing.inputTokens += inputTokens;
    existing.outputTokens += outputTokens;
    existing.requests += 1;
    existing.estimatedCost += cost;
  } else {
    history.push({
      date: today,
      inputTokens,
      outputTokens,
      requests: 1,
      estimatedCost: cost,
    });
  }

  saveUsageHistory(history);
}

export function getUsageStats(): {
  today: DailyUsage | null;
  thisMonth: { requests: number; estimatedCost: number; totalTokens: number };
  allTime: { requests: number; estimatedCost: number; totalTokens: number };
} {
  const history = getUsageHistory();
  const todayStr = new Date().toISOString().split('T')[0];
  const monthStr = todayStr.slice(0, 7);

  const today = history.find((h) => h.date === todayStr) ?? null;

  const thisMonth = history
    .filter((h) => h.date.startsWith(monthStr))
    .reduce(
      (acc, h) => ({
        requests: acc.requests + h.requests,
        estimatedCost: acc.estimatedCost + h.estimatedCost,
        totalTokens: acc.totalTokens + h.inputTokens + h.outputTokens,
      }),
      { requests: 0, estimatedCost: 0, totalTokens: 0 }
    );

  const allTime = history.reduce(
    (acc, h) => ({
      requests: acc.requests + h.requests,
      estimatedCost: acc.estimatedCost + h.estimatedCost,
      totalTokens: acc.totalTokens + h.inputTokens + h.outputTokens,
    }),
    { requests: 0, estimatedCost: 0, totalTokens: 0 }
  );

  return { today, thisMonth, allTime };
}
