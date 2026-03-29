/**
 * Wellness Intelligence — invisible performance optimization layer.
 * NOT a wellness module. NOT features. Just smart signals inside Battery.
 *
 * Three touchpoints:
 * 1. Low energy → contextual micro-recovery suggestion
 * 2. Pattern detection → "low energy correlates with [X]"
 * 3. Lunch spend → passive cost awareness tied to Runway
 */

// === Micro-Recovery Exercises (contextual, never browseable) ===

interface MicroRecovery {
  id: string;
  name: string;
  duration: string;
  instruction: string;
  context: 'desk' | 'standing' | 'breathing';
}

const MICRO_RECOVERIES: MicroRecovery[] = [
  { id: 'neck-release', name: 'Neck Release', duration: '60s', instruction: 'Drop your chin to your chest. Slowly roll your head to the right ear, then back to center, then left ear. 5 slow circles each direction.', context: 'desk' },
  { id: 'shoulder-shrug', name: 'Shoulder Reset', duration: '30s', instruction: 'Raise both shoulders to your ears. Hold 5 seconds. Drop them completely. Repeat 5 times.', context: 'desk' },
  { id: 'wrist-circles', name: 'Wrist Circles', duration: '30s', instruction: 'Extend arms forward. Make slow circles with your wrists — 10 each direction. Shake hands loosely after.', context: 'desk' },
  { id: 'eye-rest', name: 'Eye Reset', duration: '60s', instruction: 'Close your eyes. Place warm palms over them. Breathe slowly for 60 seconds. Open to something distant.', context: 'desk' },
  { id: 'box-breathing', name: 'Box Breathing', duration: '90s', instruction: 'Breathe in for 4 counts. Hold 4. Out for 4. Hold 4. Repeat 5 cycles. You will feel different after.', context: 'breathing' },
  { id: 'standing-stretch', name: 'Full Body Stretch', duration: '60s', instruction: 'Stand. Reach arms overhead, interlace fingers, push palms to ceiling. Hold 10s. Side bend left 10s. Right 10s. Fold forward, let arms hang.', context: 'standing' },
  { id: 'wall-push', name: 'Wall Push-Up', duration: '45s', instruction: 'Face a wall, arms extended. Lean in slowly, push back. 10 reps. Gets blood flowing without breaking a sweat.', context: 'standing' },
  { id: 'deep-exhale', name: 'Extended Exhale', duration: '60s', instruction: 'Inhale 4 counts through nose. Exhale 8 counts through mouth. The long exhale activates your rest-and-digest system. 5 cycles.', context: 'breathing' },
];

/**
 * Get a contextual micro-recovery based on time of day and energy level.
 */
export function suggestMicroRecovery(energyLevel: number, hour: number): MicroRecovery {
  // Morning (before 11) → breathing/eye rest (gentle start)
  // Midday (11-14) → standing (post-lunch revival)
  // Afternoon (14-17) → desk stretches (staying alert)
  // Evening (17+) → breathing (wind down)

  let pool: MicroRecovery[];
  if (hour < 11) {
    pool = MICRO_RECOVERIES.filter((r) => r.context === 'breathing' || r.context === 'desk');
  } else if (hour < 14) {
    pool = MICRO_RECOVERIES.filter((r) => r.context === 'standing');
  } else if (hour < 17) {
    pool = MICRO_RECOVERIES.filter((r) => r.context === 'desk');
  } else {
    pool = MICRO_RECOVERIES.filter((r) => r.context === 'breathing');
  }

  // If critically low energy, prefer breathing
  if (energyLevel <= 1) {
    pool = MICRO_RECOVERIES.filter((r) => r.context === 'breathing');
  }

  // Pick based on day (deterministic per day, not random)
  const dayIndex = Math.floor(Date.now() / 86400000);
  return pool[dayIndex % pool.length];
}

// === Pattern Detection ===

export interface EnergyPattern {
  type: 'meeting-load' | 'afternoon-dip' | 'monday-drain' | 'streak-boost' | 'general';
  message: string;
  severity: 'info' | 'warning';
}

/**
 * Detect energy patterns from check-in + work log data.
 * Requires 7+ days of data.
 */
export function detectEnergyPatterns(
  checkins: { date: string; level: number }[],
  logs: { date: string; impactType: string }[]
): EnergyPattern[] {
  if (checkins.length < 7) return [];

  const patterns: EnergyPattern[] = [];

  // Day-of-week analysis
  const dayAvgs: Record<number, { total: number; count: number }> = {};
  checkins.forEach((c) => {
    const dow = new Date(c.date).getDay();
    if (!dayAvgs[dow]) dayAvgs[dow] = { total: 0, count: 0 };
    dayAvgs[dow].total += c.level;
    dayAvgs[dow].count++;
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const sorted = Object.entries(dayAvgs)
    .map(([dow, data]) => ({ dow: parseInt(dow), avg: data.total / data.count }))
    .filter((d) => d.avg > 0);

  if (sorted.length >= 3) {
    const worst = sorted.sort((a, b) => a.avg - b.avg)[0];
    if (worst.avg < 2.5) {
      patterns.push({
        type: 'monday-drain',
        message: `${dayNames[worst.dow]}s are your lowest energy day (avg ${worst.avg.toFixed(1)}/5). Consider protecting that day.`,
        severity: 'warning',
      });
    }
  }

  // High-activity vs low-energy correlation
  const dateLogCounts: Record<string, number> = {};
  logs.forEach((l) => { dateLogCounts[l.date] = (dateLogCounts[l.date] ?? 0) + 1; });

  const busyDayEnergy: number[] = [];
  const lightDayEnergy: number[] = [];
  checkins.forEach((c) => {
    const logCount = dateLogCounts[c.date] ?? 0;
    if (logCount >= 3) busyDayEnergy.push(c.level);
    else if (logCount <= 1) lightDayEnergy.push(c.level);
  });

  if (busyDayEnergy.length >= 3 && lightDayEnergy.length >= 3) {
    const busyAvg = busyDayEnergy.reduce((s, l) => s + l, 0) / busyDayEnergy.length;
    const lightAvg = lightDayEnergy.reduce((s, l) => s + l, 0) / lightDayEnergy.length;
    if (busyAvg < lightAvg - 0.5) {
      patterns.push({
        type: 'meeting-load',
        message: `Heavy work days drain you more than you think (${busyAvg.toFixed(1)} vs ${lightAvg.toFixed(1)} avg energy). Pace yourself.`,
        severity: 'warning',
      });
    }
  }

  // Overall trend
  const recent = checkins.slice(0, 7);
  const older = checkins.slice(7, 14);
  if (recent.length >= 5 && older.length >= 5) {
    const recentAvg = recent.reduce((s, c) => s + c.level, 0) / recent.length;
    const olderAvg = older.reduce((s, c) => s + c.level, 0) / older.length;
    if (recentAvg > olderAvg + 0.5) {
      patterns.push({
        type: 'streak-boost',
        message: `Your energy is trending up (${recentAvg.toFixed(1)} vs ${olderAvg.toFixed(1)} last week). Whatever changed, keep doing it.`,
        severity: 'info',
      });
    }
  }

  return patterns;
}

// === Lunch Spend Intelligence ===

export type LunchChoice = 'brought' | 'bought' | 'skipped';

export function calculateLunchInsight(
  choices: { date: string; choice: LunchChoice; estimate?: number }[]
): { weeklySpend: number; yearlyProjection: number; runwayImpactMonths: number; message: string } | null {
  const bought = choices.filter((c) => c.choice === 'bought');
  if (bought.length < 5) return null;

  const avgSpend = bought.reduce((s, c) => s + (c.estimate ?? 15), 0) / bought.length;
  const buyRate = bought.length / choices.length;
  const weeklySpend = Math.round(avgSpend * buyRate * 5);
  const yearlyProjection = weeklySpend * 52;

  // Assume monthly expenses of ~$3500 for runway impact
  const monthlySavings = weeklySpend * 2 * 4.33; // if they cut buying in half
  const runwayImpactMonths = monthlySavings > 0 ? monthlySavings * 12 / (3500 * 12) * 12 : 0;

  const message = `You buy lunch ~${Math.round(buyRate * 5)}x/week (~$${weeklySpend}/week, ~$${yearlyProjection.toLocaleString()}/year). Bringing lunch 2 more days could add ~${runwayImpactMonths.toFixed(1)} months to your runway.`;

  return { weeklySpend, yearlyProjection, runwayImpactMonths, message };
}
