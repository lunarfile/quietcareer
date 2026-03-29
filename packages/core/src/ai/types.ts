/**
 * AI message types — shared between web and native.
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type AIProvider = 'openrouter' | 'claude' | 'openai' | 'gemini' | 'groq';
