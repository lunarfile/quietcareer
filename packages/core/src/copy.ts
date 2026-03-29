/**
 * Contextual copy that rotates for variety.
 * Keeps the app feeling alive instead of robotic.
 */

const ENTRY_TOASTS = [
  'Logged. One more data point in your favor.',
  'Got it. Your record is growing.',
  'Saved. Nobody sees this but you.',
  'Noted. The AI will find the patterns \u2014 you just keep writing.',
  'Captured. Future-you will be grateful.',
];

const ENERGY_TOASTS = [
  'Checked in. Trends update with each one.',
  'Logged. Your battery history just got a little clearer.',
  'Got it. That took 10 seconds and it matters more than you think.',
];

const BRAG_TOASTS = [
  'Proof created. Ready for reviews, resumes, or leverage.',
  'Your impact statement is ready. Saved to your file.',
  'Done. That\u2019s one more thing they can\u2019t take credit for.',
];

const GOAL_COMPLETE_TOASTS = [
  'Done. You did that.',
  'Goal complete. Quiet progress is still progress.',
  'Checked off. One less thing between you and where you\u2019re going.',
];

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const copy = {
  entryToast: () => pick(ENTRY_TOASTS),
  energyToast: () => pick(ENERGY_TOASTS),
  bragToast: () => pick(BRAG_TOASTS),
  goalCompleteToast: () => pick(GOAL_COMPLETE_TOASTS),
};
