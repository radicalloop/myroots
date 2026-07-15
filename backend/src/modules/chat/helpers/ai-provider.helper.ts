import { ApiError } from '../../../utils/ApiError';
import { AiChatParams } from '../types/ai.types';

export const OPENAI_COMPATIBLE_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  together: 'https://api.together.xyz/v1',
  mistral: 'https://api.mistral.ai/v1',
};

export function buildOpenAiTokenLimit(
  model: string,
  limit: number,
): Record<string, number> {
  const usesCompletionTokens = /^(gpt-5|o\d)/i.test(model);
  return usesCompletionTokens
    ? { max_completion_tokens: limit }
    : { max_tokens: limit };
}

function resolveImageUrl(params: AiChatParams): string {
  if (!params.image) {
    throw new ApiError(500, 'Image payload is missing');
  }

  if (params.image.url) {
    return params.image.url;
  }

  if (params.image.data) {
    return `data:${params.image.contentType};base64,${params.image.data}`;
  }

  throw new ApiError(400, 'Image must include a URL or base64 data');
}

function buildOpenAiUserContent(
  params: AiChatParams,
): string | Record<string, unknown>[] {
  if (!params.image) {
    return params.userMessage;
  }

  return [
    {
      type: 'image_url',
      image_url: { url: resolveImageUrl(params) },
    },
    { type: 'text', text: params.userMessage },
  ];
}

export async function callOpenAiCompatible(
  baseUrl: string,
  model: string,
  apiKey: string,
  params: AiChatParams,
  fetchWithTimeout: (url: string, init: RequestInit) => Promise<Response>,
  maxOutputTokens: number,
): Promise<string> {
  const userContent = buildOpenAiUserContent(params);

  const messages: Array<{ role: string; content: unknown }> = [
    { role: 'system', content: params.systemPrompt },
  ];

  if (params.conversationHistory?.length) {
    for (const msg of params.conversationHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: 'user', content: userContent });

  const res = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      ...buildOpenAiTokenLimit(model, maxOutputTokens),
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(
      502,
      `AI provider error (${res.status}): ${text.slice(0, 300)}`,
    );
  }

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;

  if (typeof text !== 'string') {
    throw new ApiError(502, 'AI provider returned an unexpected response');
  }

  return text;
}

export async function callAnthropic(
  model: string,
  apiKey: string,
  params: AiChatParams,
  fetchWithTimeout: (url: string, init: RequestInit) => Promise<Response>,
  maxOutputTokens: number,
): Promise<string> {
  const content: Record<string, unknown>[] = [];

  if (params.image) {
    if (!params.image.data) {
      throw new ApiError(
        400,
        'Anthropic image requests require base64 image data',
      );
    }

    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: params.image.contentType,
        data: params.image.data,
      },
    });
  }

  content.push({ type: 'text', text: params.userMessage });

  const messages: Array<{ role: string; content: Record<string, unknown>[] }> = [];

  if (params.conversationHistory?.length) {
    for (const msg of params.conversationHistory) {
      messages.push({
        role: msg.role,
        content: [{ type: 'text', text: msg.content }],
      });
    }
  }

  messages.push({ role: 'user', content });

  const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxOutputTokens,
      system: params.systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(
      502,
      `AI provider error (${res.status}): ${text.slice(0, 300)}`,
    );
  }

  const json = await res.json();
  const text = Array.isArray(json?.content)
    ? json.content
        .filter((block: { type: string }) => block?.type === 'text')
        .map((block: { text: string }) => block.text)
        .join('\n')
        .trim()
    : '';

  if (!text) {
    throw new ApiError(502, 'AI provider returned an unexpected response');
  }

  return text;
}
