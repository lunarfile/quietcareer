/**
 * In-app reminder system.
 * Handles stretch breaks, logging nudges, and energy check-in reminders.
 * Works both in-app (banner) and background (Capacitor Local Notifications).
 */

import { suggestMicroRecovery } from './wellness-intelligence';

export type ReminderType = 'stretch' | 'log-work' | 'energy-checkin';

export interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  body: string;
  action?: { label: string; href: string };
  exercise?: { name: string; duration: string; instruction: string };
}

export type StretchInterval = 0 | 30 | 60 | 90 | 120; // 0 = off, minutes

const SETTINGS_KEY = 'qc_reminder_settings';
const LAST_STRETCH_KEY = 'qc_last_stretch_reminder';
const LAST_LOG_KEY = 'qc_last_log_reminder';

// === Settings ===

export interface ReminderSettings {
  stretchInterval: StretchInterval; // minutes, 0 = off
  logWorkReminder: boolean; // 5pm daily
  energyReminder: boolean; // 9am daily
}

const DEFAULT_SETTINGS: ReminderSettings = {
  stretchInterval: 60,
  logWorkReminder: true,
  energyReminder: true,
};

export function getReminderSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveReminderSettings(settings: ReminderSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// === Stretch Reminder Logic ===

export function shouldShowStretchReminder(): boolean {
  const settings = getReminderSettings();
  if (settings.stretchInterval === 0) return false;

  const lastShown = localStorage.getItem(LAST_STRETCH_KEY);
  if (!lastShown) return true;

  const elapsed = Date.now() - parseInt(lastShown);
  return elapsed >= settings.stretchInterval * 60 * 1000;
}

export function markStretchReminderShown(): void {
  localStorage.setItem(LAST_STRETCH_KEY, Date.now().toString());
}

export function getStretchReminder(): Reminder {
  const hour = new Date().getHours();
  const recovery = suggestMicroRecovery(3, hour); // neutral energy, current hour

  return {
    id: 'stretch-' + Date.now(),
    type: 'stretch',
    title: 'Time for a reset',
    body: `${recovery.duration} break — ${recovery.name}`,
    exercise: {
      name: recovery.name,
      duration: recovery.duration,
      instruction: recovery.instruction,
    },
  };
}

// === Log Work Reminder ===

export function shouldShowLogReminder(): boolean {
  const settings = getReminderSettings();
  if (!settings.logWorkReminder) return false;

  const hour = new Date().getHours();
  if (hour < 16 || hour > 19) return false; // Only between 4-7pm

  const today = new Date().toISOString().split('T')[0];
  const lastShown = localStorage.getItem(LAST_LOG_KEY);
  return lastShown !== today;
}

export function markLogReminderShown(): void {
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem(LAST_LOG_KEY, today);
}

export function getLogReminder(): Reminder {
  return {
    id: 'log-' + Date.now(),
    type: 'log-work',
    title: 'End of day',
    body: 'What happened at work today? One sentence is enough.',
    action: { label: 'Write It Down', href: '/journal' },
  };
}

// === Energy Check-in Reminder ===

export function shouldShowEnergyReminder(): boolean {
  const settings = getReminderSettings();
  if (!settings.energyReminder) return false;

  const hour = new Date().getHours();
  if (hour < 8 || hour > 11) return false; // Only between 8-11am

  const today = new Date().toISOString().split('T')[0];
  const lastShown = localStorage.getItem('qc_last_energy_reminder');
  return lastShown !== today;
}

export function markEnergyReminderShown(): void {
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem('qc_last_energy_reminder', today);
}

export function getEnergyReminder(): Reminder {
  return {
    id: 'energy-' + Date.now(),
    type: 'energy-checkin',
    title: 'Morning check-in',
    body: "How's your battery today?",
    action: { label: 'Check In', href: '/energy' },
  };
}

// === Check all reminders ===

export function getActiveReminder(): Reminder | null {
  if (shouldShowStretchReminder()) return getStretchReminder();
  if (shouldShowLogReminder()) return getLogReminder();
  if (shouldShowEnergyReminder()) return getEnergyReminder();
  return null;
}
