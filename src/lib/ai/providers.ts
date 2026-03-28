/**
 * Multi-AI provider support.
 * Supports: OpenRouter, Claude, OpenAI, Gemini, Groq
 * All calls run client-side — BYOK (Bring Your Own Key).
 */

import { trackUsage } from './usage-tracker';

export type AIProvider = 'openrouter' | 'claude' | 'openai' | 'gemini' | 'groq';

export interface AIProviderConfig {
  id: AIProvider;
  name: string;
  baseUrl: string;
  defaultModel: string;
  models: { id: string; name: string }[];
  keyPrefix: string;
  headerStyle: 'bearer' | 'x-api-key';
  freeModels?: string[];
}

export const AI_PROVIDERS: Record<AIProvider, AIProviderConfig> = {
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-sonnet-4',
    models: [
      { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' },
      { id: 'anthropic/claude-haiku-4', name: 'Claude Haiku 4' },
      { id: 'openai/gpt-4o', name: 'GPT-4o' },
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
    ],
    keyPrefix: 'sk-or-',
    headerStyle: 'bearer',
  },
  claude: {
    id: 'claude',
    name: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4-20250514',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
    ],
    keyPrefix: 'sk-ant-',
    headerStyle: 'x-api-key',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    ],
    keyPrefix: 'sk-',
    headerStyle: 'bearer',
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.5-flash',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    ],
    keyPrefix: 'AI',
    headerStyle: 'bearer',
    freeModels: ['gemini-2.5-flash'],
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
    ],
    keyPrefix: 'gsk_',
    headerStyle: 'bearer',
  },
};

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIStreamCallbacks {
  onChunk: (text: string) => void;
  onDone: (fullText: string, usage?: { inputTokens: number; outputTokens: number }) => void;
  onError: (error: Error) => void;
}

/**
 * Send a message to the selected AI provider with streaming.
 */
export async function streamAIResponse(
  provider: AIProvider,
  apiKey: string,
  model: string,
  messages: AIMessage[],
  callbacks: AIStreamCallbacks,
  maxTokens: number = 2048
): Promise<void> {
  const config = AI_PROVIDERS[provider];

  if (provider === 'gemini') {
    return streamGemini(apiKey, model, messages, callbacks, maxTokens);
  }

  // OpenAI-compatible providers (OpenRouter, OpenAI, Groq) + Claude
  const isClaude = provider === 'claude';
  const url = isClaude
    ? `${config.baseUrl}/messages`
    : `${config.baseUrl}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.headerStyle === 'bearer') {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2024-06-01';
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
  }

  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'QuietCareer';
  }

  const systemMsg = messages.find((m) => m.role === 'system')?.content;
  const userMessages = messages.filter((m) => m.role !== 'system');

  const body = isClaude
    ? {
        model,
        max_tokens: maxTokens,
        system: systemMsg,
        messages: userMessages,
        stream: true,
      }
    : {
        model,
        max_tokens: maxTokens,
        messages,
        stream: true,
      };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`${config.name} API error (${response.status}): ${errorBody}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response stream');

    const decoder = new TextDecoder();
    let fullText = '';
    let inputTokens = 0;
    let outputTokens = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);

          if (isClaude) {
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              fullText += parsed.delta.text;
              callbacks.onChunk(parsed.delta.text);
            }
            if (parsed.type === 'message_delta' && parsed.usage) {
              outputTokens = parsed.usage.output_tokens ?? 0;
            }
            if (parsed.type === 'message_start' && parsed.message?.usage) {
              inputTokens = parsed.message.usage.input_tokens ?? 0;
            }
          } else {
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              callbacks.onChunk(content);
            }
            if (parsed.usage) {
              inputTokens = parsed.usage.prompt_tokens ?? 0;
              outputTokens = parsed.usage.completion_tokens ?? 0;
            }
          }
        } catch {
          // Skip malformed SSE chunks
        }
      }
    }

    trackUsage(inputTokens, outputTokens);
    callbacks.onDone(fullText, { inputTokens, outputTokens });
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Gemini uses a different API format (not OpenAI-compatible).
 */
async function streamGemini(
  apiKey: string,
  model: string,
  messages: AIMessage[],
  callbacks: AIStreamCallbacks,
  maxTokens: number
): Promise<void> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const systemMsg = messages.find((m) => m.role === 'system')?.content;
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: { maxOutputTokens: maxTokens },
  };

  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg }] };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response stream');

    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.slice(6));
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            fullText += text;
            callbacks.onChunk(text);
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }

    // Gemini doesn't always return token counts, estimate from text length
    const estimatedInput = messages.reduce((s, m) => s + m.content.length, 0) / 4;
    const estimatedOutput = fullText.length / 4;
    trackUsage(Math.round(estimatedInput), Math.round(estimatedOutput));
    callbacks.onDone(fullText);
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}
