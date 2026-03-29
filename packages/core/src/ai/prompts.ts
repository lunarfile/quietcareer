/**
 * Pre-built prompt templates for AI-powered career features.
 */

import type { AIMessage } from './types';

export function rewriteAsImpact(entry: string, role: string): AIMessage[] {
  return [
    {
      role: 'system',
      content: `You are a career coach who rewrites casual work log entries into professional impact statements. Use metrics and business value framing when possible. Output 1-2 sentences per statement. The user is a ${role}.`,
    },
    {
      role: 'user',
      content: `Rewrite this work log entry as a professional impact statement:\n\n"${entry}"`,
    },
  ];
}

export function generateResumeBullets(entries: string[], role: string): AIMessage[] {
  return [
    {
      role: 'system',
      content: `You are a professional resume writer. Use the XYZ formula: "Accomplished [X] as measured by [Y] by doing [Z]." Use STAR format where appropriate. Output bullet points. The user is a ${role}.`,
    },
    {
      role: 'user',
      content: `Generate resume bullet points from these work log entries:\n\n${entries.map((e, i) => `${i + 1}. ${e}`).join('\n')}`,
    },
  ];
}

export function performanceReview(entries: string[], role: string, period: string): AIMessage[] {
  return [
    {
      role: 'system',
      content: `You are a performance review self-assessment specialist. Organize by theme: technical impact, leadership, collaboration, and growth. Write in first person with a confident but not arrogant tone. The user is a ${role}.`,
    },
    {
      role: 'user',
      content: `Write a performance review self-assessment for ${period} based on these accomplishments:\n\n${entries.map((e, i) => `${i + 1}. ${e}`).join('\n')}`,
    },
  ];
}

export function oneOnOneTalkingPoints(
  entries: string[],
  energyLevel: number | null,
  role: string
): AIMessage[] {
  const energyContext = energyLevel
    ? `\n\nCurrent energy level: ${energyLevel}/5.`
    : '';

  return [
    {
      role: 'system',
      content: `You are a career coach preparing someone for a 1:1 meeting with their manager. Generate 5-7 concise talking points covering: recent wins, current blockers, growth areas, and questions to ask. One sentence per point. The user is a ${role}.`,
    },
    {
      role: 'user',
      content: `Generate 1:1 talking points based on my recent work:\n\n${entries.map((e, i) => `${i + 1}. ${e}`).join('\n')}${energyContext}`,
    },
  ];
}

export function escapeRunwayAdvice(
  monthlyBurn: number,
  savings: number,
  runwayMonths: number
): AIMessage[] {
  return [
    {
      role: 'system',
      content: `You are a conservative financial advisor. Consider healthcare costs, emergency funds, and realistic job search timelines. Never encourage unsafe quitting. Be direct and practical.`,
    },
    {
      role: 'user',
      content: `My financial situation:\n- Monthly burn rate: $${monthlyBurn.toLocaleString()}\n- Total savings: $${savings.toLocaleString()}\n- Runway: ${runwayMonths.toFixed(1)} months\n\nGive me honest, practical advice about my career escape options.`,
    },
  ];
}

export function suggestEnergyMode(
  recentLevels: number[],
  averageEnergy: number
): AIMessage[] {
  return [
    {
      role: 'system',
      content: `You are an empathetic career coach. Based on energy check-in history, suggest one of four modes: Coast (protect energy, do minimum), Maintain (steady state), Push (seize opportunity), or Escape (start planning exit). One paragraph, warm tone.`,
    },
    {
      role: 'user',
      content: `My recent energy levels (1-5 scale, most recent first): ${recentLevels.join(', ')}\nAverage: ${averageEnergy.toFixed(1)}\n\nWhat mode should I be in right now?`,
    },
  ];
}

export function meetingPrepPrompt(
  entries: string[],
  meetingType: string,
  attendees: string,
  role: string,
  previousActionItems: string[]
): AIMessage[] {
  const actionContext = previousActionItems.length > 0
    ? `\n\nPrevious action items to follow up on:\n${previousActionItems.map((a, i) => `${i + 1}. ${a}`).join('\n')}`
    : '';

  return [
    {
      role: 'system',
      content: `You are a strategic career coach preparing someone for a ${meetingType} meeting. Generate a concise briefing with these sections:

**Top 3 Wins** — the most impressive things since last meeting
**Talking Points** — 4-5 points that frame their work strategically (impact, leadership, initiative)
**Questions to Ask** — 2-3 strategic questions that demonstrate engagement and thinking ahead
**Follow-ups** — any previous action items to address

Keep each point to 1-2 sentences. The tone is confident but not arrogant. The user is a ${role}.`,
    },
    {
      role: 'user',
      content: `Prepare my briefing for a ${meetingType} meeting${attendees ? ` with ${attendees}` : ''}.\n\nMy recent work:\n${entries.map((e, i) => `${i + 1}. ${e}`).join('\n')}${actionContext}`,
    },
  ];
}

export function weeklySnapshotInsight(
  wins: string[],
  energyAvg: number,
  riskLevel: string,
  mode: string,
  role: string
): AIMessage[] {
  return [
    {
      role: 'system',
      content: `You are a direct, warm career advisor. Based on someone's weekly career data, give a 2-3 sentence personalized insight. Be honest, not cheerful. If things look tough, acknowledge it. If things look good, say so without hype. Never use corporate jargon. The user is a ${role}.`,
    },
    {
      role: 'user',
      content: `My week:\n- Wins: ${wins.length > 0 ? wins.join('; ') : 'None logged'}\n- Average energy: ${energyAvg.toFixed(1)}/5\n- Risk level: ${riskLevel}\n- Suggested mode: ${mode}\n\nWhat should I be thinking about right now?`,
    },
  ];
}

export function weeklyRollupSummary(entries: string[], role: string): AIMessage[] {
  return [
    {
      role: 'system',
      content: `You are a concise career analyst. Summarize a week of work entries into a 3-4 sentence narrative that highlights themes, impact, and patterns. Use plain language. The user is a ${role}.`,
    },
    {
      role: 'user',
      content: `Summarize my week:\n\n${entries.map((e, i) => `${i + 1}. ${e}`).join('\n')}`,
    },
  ];
}
