import Dexie, { type EntityTable } from 'dexie';

// === Type Definitions ===

export type ImpactType =
  | 'shipped'
  | 'improved'
  | 'fixed'
  | 'led'
  | 'learned'
  | 'mentored'
  | 'proposed'
  | 'documented'
  | 'other';

export type EnergyLevel = 1 | 2 | 3 | 4 | 5;

export type EnergyMode = 'coast' | 'maintain' | 'push' | 'escape';

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH';

export type TrafficLight = 'green' | 'yellow' | 'red';

export type Trend = 'up' | 'down' | 'flat';

export type FinancialType = 'income' | 'expense' | 'savings' | 'debt';

export type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual' | 'one-time';

export type GoalCategory = 'skill' | 'role' | 'financial' | 'escape' | 'side-project' | 'network' | 'health' | 'other';

export type GoalStatus = 'active' | 'completed' | 'paused' | 'abandoned';

export type BragTemplate =
  | 'performance-review'
  | 'promotion-packet'
  | 'resume-bullets'
  | 'linkedin-update'
  | '1on1-talking-points'
  | 'custom';

export type MeetingType = 'one-on-one' | 'skip-level' | 'team-standup' | 'review' | 'other';

export interface WorkLog {
  id: string;
  date: string;
  content: string;
  tags: string[];
  impactType: ImpactType;
  project: string;
  aiRewrite: string | null;
  mood: number | null;
  isPrivate: boolean;
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface EnergyCheckin {
  id: string;
  date: string;
  level: EnergyLevel;
  notes: string;
  suggestedMode: EnergyMode | null;
  tags: string[];
  createdAt: number;
}

export interface FinancialData {
  id: string;
  type: FinancialType;
  category: string;
  amount: number;
  recurring: boolean;
  frequency: Frequency;
  name: string;
  notes: string;
  includeInRunway: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Goal {
  id: string;
  title: string;
  category: GoalCategory;
  targetDate: string | null;
  status: GoalStatus;
  progress: number;
  milestones: string;
  notes: string;
  linkedLogIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Setting {
  key: string;
  value: string;
  encrypted: boolean;
  updatedAt: number;
}

export interface BragDocument {
  id: string;
  title: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  generatedContent: string;
  editedContent: string;
  templateUsed: BragTemplate;
  includedLogIds: string[];
  exportedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface Meeting {
  id: string;
  title: string;
  type: MeetingType;
  frequency: Frequency;
  attendees: string;
  lastMeetingDate: string | null;
  nextMeetingDate: string | null;
  prepNotes: string;
  actionItems: string; // JSON stringified string[]
  historicalNotes: string; // JSON stringified {date, notes, actionItems}[]
  createdAt: number;
  updatedAt: number;
}

export interface WeeklySnapshot {
  id: string;
  weekStartDate: string;
  healthScore: number;
  riskLevel: RiskLevel;
  metrics: string; // JSON: {impact, visibility, skills, runway, energy}
  wins: string; // JSON stringified string[]
  energyTrend: string; // JSON: {avg, direction}
  streak: number;
  suggestedMode: EnergyMode | null;
  ruleInsight: string;
  aiInsight: string | null;
  createdAt: number;
}
