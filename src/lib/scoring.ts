/**
 * Career scoring engine — pure functions, no side effects.
 * Powers traffic light dashboard, risk levels, energy modes, and weekly snapshots.
 */

import type {
  WorkLog,
  EnergyCheckin,
  BragDocument,
  Meeting,
  EnergyMode,
  TrafficLight,
  Trend,
  RiskLevel,
} from './db';

export interface TrafficLightScore {
  label: string;
  score: number; // 0-100
  level: TrafficLight;
  trend: Trend;
  detail: string;
}

// === Impact Score ===
// Based on logging frequency + diversity of impact types

export function calculateImpactScore(
  logs: WorkLog[],
  prevLogs: WorkLog[]
): TrafficLightScore {
  const uniqueDays = new Set(logs.map((l) => l.date)).size;
  const uniqueTypes = new Set(logs.map((l) => l.impactType)).size;
  const prevUniqueDays = new Set(prevLogs.map((l) => l.date)).size;

  // Score: days logged (max 60pts for 5+/week) + type diversity (max 40pts for 4+ types)
  const dayScore = Math.min(uniqueDays / 20, 1) * 60;
  const typeScore = Math.min(uniqueTypes / 4, 1) * 40;
  const score = Math.round(dayScore + typeScore);

  const level: TrafficLight =
    score >= 60 ? 'green' : score >= 30 ? 'yellow' : 'red';

  const trend: Trend =
    uniqueDays > prevUniqueDays ? 'up' : uniqueDays < prevUniqueDays ? 'down' : 'flat';

  const detail =
    level === 'green'
      ? `${uniqueDays} days logged, ${uniqueTypes} impact types`
      : level === 'yellow'
        ? `${uniqueDays} days logged — aim for 4+ per week`
        : 'Start logging daily to build your proof record';

  return { label: 'Impact', score, level, trend, detail };
}

// === Visibility Score ===
// Based on brag docs generated + meetings prepped

export function calculateVisibilityScore(
  bragDocs: BragDocument[],
  meetings: Meeting[],
  prevBragCount: number
): TrafficLightScore {
  const recentBrags = bragDocs.length;
  const preppedMeetings = meetings.filter((m) => m.prepNotes.length > 0).length;

  // Score: brags (max 50pts for 2+) + meetings prepped (max 50pts for 3+)
  const bragScore = Math.min(recentBrags / 2, 1) * 50;
  const meetingScore = Math.min(preppedMeetings / 3, 1) * 50;
  const score = Math.round(bragScore + meetingScore);

  const level: TrafficLight =
    score >= 50 ? 'green' : score >= 25 ? 'yellow' : 'red';

  const trend: Trend =
    recentBrags > prevBragCount ? 'up' : recentBrags < prevBragCount ? 'down' : 'flat';

  const detail =
    level === 'green'
      ? `${recentBrags} career assets, ${preppedMeetings} meetings prepped`
      : level === 'yellow'
        ? 'Generate a career asset or prep your next meeting'
        : 'Your work is invisible — create proof documents';

  return { label: 'Visibility', score, level, trend, detail };
}

// === Skills Diversity ===
// Based on unique tags/projects in the period

export function calculateSkillsDiversity(
  logs: WorkLog[],
  prevLogs: WorkLog[]
): TrafficLightScore {
  const allTags = logs.flatMap((l) => [...l.tags, l.project]).filter(Boolean);
  const uniqueTags = new Set(allTags).size;
  const prevTags = new Set(prevLogs.flatMap((l) => [...l.tags, l.project]).filter(Boolean)).size;

  // Score: unique tags/skills (max 100 for 8+)
  const score = Math.round(Math.min(uniqueTags / 8, 1) * 100);

  const level: TrafficLight =
    score >= 50 ? 'green' : score >= 25 ? 'yellow' : 'red';

  const trend: Trend =
    uniqueTags > prevTags ? 'up' : uniqueTags < prevTags ? 'down' : 'flat';

  const detail =
    level === 'green'
      ? `${uniqueTags} unique skills/projects tracked`
      : level === 'yellow'
        ? `Only ${uniqueTags} skills — diversify your logged work`
        : 'Tag your entries with projects and skills';

  return { label: 'Skills', score, level, trend, detail };
}

// === Runway Score ===
// Maps months of runway to traffic light

export function calculateRunwayScore(
  months: number,
  prevMonths: number
): TrafficLightScore {
  const score = Math.round(Math.min(months / 12, 1) * 100);

  const level: TrafficLight =
    months >= 12 ? 'green' : months >= 6 ? 'yellow' : 'red';

  const trend: Trend =
    months > prevMonths + 0.5 ? 'up' : months < prevMonths - 0.5 ? 'down' : 'flat';

  const detail =
    level === 'green'
      ? `${months.toFixed(1)} months — comfortable position`
      : level === 'yellow'
        ? `${months.toFixed(1)} months — build a bigger buffer`
        : months > 0
          ? `${months.toFixed(1)} months — this needs attention`
          : 'Add your financial data to see your runway';

  return { label: 'Runway', score, level, trend, detail };
}

// === Energy Trend ===
// 30-day rolling average

export function calculateEnergyTrend(
  checkins: EnergyCheckin[],
  prevCheckins: EnergyCheckin[]
): TrafficLightScore {
  if (checkins.length === 0) {
    return {
      label: 'Energy',
      score: 0,
      level: 'red',
      trend: 'flat',
      detail: 'Start checking in to see your energy patterns',
    };
  }

  const avg = checkins.reduce((s, c) => s + c.level, 0) / checkins.length;
  const prevAvg =
    prevCheckins.length > 0
      ? prevCheckins.reduce((s, c) => s + c.level, 0) / prevCheckins.length
      : avg;

  const score = Math.round((avg / 5) * 100);

  const level: TrafficLight =
    avg >= 3.5 ? 'green' : avg >= 2.5 ? 'yellow' : 'red';

  const trend: Trend =
    avg > prevAvg + 0.3 ? 'up' : avg < prevAvg - 0.3 ? 'down' : 'flat';

  const detail =
    level === 'green'
      ? `${avg.toFixed(1)}/5 avg — you're in a good rhythm`
      : level === 'yellow'
        ? `${avg.toFixed(1)}/5 avg — watch for burnout signals`
        : `${avg.toFixed(1)}/5 avg — protect your energy right now`;

  return { label: 'Energy', score, level, trend, detail };
}

// === Risk Level ===
// Aggregate of all scores

export function calculateRiskLevel(scores: TrafficLightScore[]): RiskLevel {
  const redCount = scores.filter((s) => s.level === 'red').length;
  const yellowCount = scores.filter((s) => s.level === 'yellow').length;

  if (redCount >= 3) return 'HIGH';
  if (redCount >= 2 || (redCount >= 1 && yellowCount >= 2)) return 'HIGH';
  if (redCount >= 1 || yellowCount >= 2) return 'MODERATE';
  return 'LOW';
}

// === Energy Mode ===
// Rule-based suggestion from average energy

export function suggestEnergyMode(avgEnergy: number): EnergyMode {
  if (avgEnergy <= 2.0) return 'escape';
  if (avgEnergy <= 2.5) return 'coast';
  if (avgEnergy <= 3.5) return 'maintain';
  return 'push';
}

export interface ModeCopy {
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  description: string;
  advice: string;
}

export function getModeCopy(mode: EnergyMode): ModeCopy {
  switch (mode) {
    case 'escape':
      return {
        label: 'Escape',
        emoji: '\u{1F6AA}',
        color: 'text-danger-text',
        bgColor: 'bg-danger/10',
        description: 'Your energy has been critically low.',
        advice:
          'Check your exit math. Update your resume. Start having honest conversations with yourself about what needs to change. This is not sustainable.',
      };
    case 'coast':
      return {
        label: 'Coast',
        emoji: '\u{1F6F6}',
        color: 'text-accent-secondary',
        bgColor: 'bg-accent-secondary/10',
        description: 'Energy is low. Protect what you have.',
        advice:
          'Do the minimum required. Say no to new commitments. Cancel optional meetings. Rest is not laziness — it is strategy.',
      };
    case 'maintain':
      return {
        label: 'Maintain',
        emoji: '\u{26F5}',
        color: 'text-warning-text',
        bgColor: 'bg-warning/10',
        description: 'Steady state. Not great, not bad.',
        advice:
          'Keep your routine. Make progress on your biggest project. This is a good week to document wins and prep for meetings.',
      };
    case 'push':
      return {
        label: 'Push',
        emoji: '\u{1F525}',
        color: 'text-success-text',
        bgColor: 'bg-success/10',
        description: 'Energy is high. This is your window.',
        advice:
          'Tackle the hard thing. Have the difficult conversation. Start the side project. Ship something. Your tank is full — use it.',
      };
  }
}

// === Rule-Based Weekly Insight ===

export function generateRuleInsight(scores: TrafficLightScore[], mode: EnergyMode): string {
  const reds = scores.filter((s) => s.level === 'red');
  const greens = scores.filter((s) => s.level === 'green');
  const improving = scores.filter((s) => s.trend === 'up');
  const declining = scores.filter((s) => s.trend === 'down');

  if (reds.length >= 3) {
    return `Multiple areas need attention: ${reds.map((r) => r.label).join(', ')}. Focus on the one that matters most to you right now.`;
  }

  if (declining.length >= 2) {
    return `${declining.map((d) => d.label).join(' and ')} declined this week. That's worth noticing — not panicking about.`;
  }

  if (improving.length >= 2) {
    return `${improving.map((i) => i.label).join(' and ')} improved. Whatever you're doing, keep doing it.`;
  }

  if (greens.length >= 4) {
    return `Strong week across the board. This is a good time to make a move or set a bigger goal.`;
  }

  if (mode === 'escape') {
    return `Your energy pattern suggests this job is costing more than it's paying. Check your runway numbers.`;
  }

  return `Steady week. Keep logging — patterns get clearer over time.`;
}
