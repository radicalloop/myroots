import { ConfigService } from '@nestjs/config';
import { ApiError } from '../../../utils/ApiError';
import { AiImageInput } from '../types/ai.types';
import { buildOpenAiTokenLimit } from './ai-provider.helper';

export interface VisionProviderConfig {
  provider: string;
  model: string;
}

const TEXT_ONLY_PROVIDERS = new Set(['deepseek']);

const OPENAI_COMPATIBLE_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  together: 'https://api.together.xyz/v1',
  mistral: 'https://api.mistral.ai/v1',
};

export function providerSupportsVision(provider: string): boolean {
  return !TEXT_ONLY_PROVIDERS.has(provider);
}

export function parseModalEnv(
  modal: string,
  envName: string,
): VisionProviderConfig {
  const separatorIndex = modal.indexOf(':');
  if (separatorIndex === -1) {
    throw new ApiError(
      500,
      `${envName} must be in the format "provider:model", e.g. "openai:gpt-4o-mini"`,
    );
  }

  const provider = modal.slice(0, separatorIndex).trim().toLowerCase();
  const model = modal.slice(separatorIndex + 1).trim();

  if (!provider || !model) {
    throw new ApiError(
      500,
      `${envName} must be in the format "provider:model", e.g. "openai:gpt-4o-mini"`,
    );
  }

  return { provider, model };
}

export function getVisionProviderConfig(
  configService: ConfigService,
): VisionProviderConfig | null {
  const modal = configService.get<string>('AI_VISION_MODAL');
  if (!modal) return null;

  const config = parseModalEnv(modal, 'AI_VISION_MODAL');
  if (!providerSupportsVision(config.provider)) {
    return null;
  }

  return config;
}

export function resolveOpenAiCompatibleBaseUrl(
  provider: string,
  configService: ConfigService,
): string | null {
  const builtIn = OPENAI_COMPATIBLE_BASE_URLS[provider];
  if (builtIn) return builtIn;

  const customBaseUrl = configService.get<string>('AI_VISION_BASE_URL');
  if (customBaseUrl) return customBaseUrl.replace(/\/$/, '');

  const sharedBaseUrl = configService.get<string>('AI_BASE_URL');
  if (sharedBaseUrl) return sharedBaseUrl.replace(/\/$/, '');

  return null;
}

export function buildImageDescriptionPrompt(userMessage: string): string {
  return (
    `The user attached an image with this message: "${userMessage}". ` +
    'Describe the image in detail, including any visible text, names, dates, ' +
    'relationships, or genealogical information. Be factual and concise.'
  );
}

export async function describeImageWithVisionModel(
  configService: ConfigService,
  visionConfig: VisionProviderConfig,
  image: AiImageInput,
  userMessage: string,
  fetchWithTimeout: (url: string, init: RequestInit) => Promise<Response>,
): Promise<string> {
  if (!image.data && !image.url) {
    throw new ApiError(400, 'Image must include a URL or base64 data');
  }

  const apiKey =
    configService.get<string>('AI_VISION_API_KEY') ??
    configService.get<string>('AI_API_KEY');

  if (!apiKey) {
    throw new ApiError(500, 'AI_VISION_API_KEY or AI_API_KEY is not configured');
  }

  if (visionConfig.provider === 'anthropic' || visionConfig.provider === 'claude') {
    if (!image.data) {
      throw new ApiError(
        400,
        'Anthropic vision fallback requires base64 image data',
      );
    }

    return describeImageWithAnthropic(
      visionConfig.model,
      apiKey,
      image,
      userMessage,
      fetchWithTimeout,
      configService,
    );
  }

  const baseUrl = resolveOpenAiCompatibleBaseUrl(
    visionConfig.provider,
    configService,
  );

  if (!baseUrl) {
    throw new ApiError(
      500,
      `Vision provider "${visionConfig.provider}" requires AI_VISION_BASE_URL or AI_BASE_URL`,
    );
  }

  const maxOutputTokens = Number(
    configService.get('AI_VISION_MAX_OUTPUT_TOKENS') ?? 600,
  );

  const res = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: visionConfig.model,
      ...buildOpenAiTokenLimit(visionConfig.model, maxOutputTokens),
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url:
                  image.url ??
                  `data:${image.contentType};base64,${image.data}`,
              },
            },
            {
              type: 'text',
              text: buildImageDescriptionPrompt(userMessage),
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(
      502,
      `Vision model error (${res.status}): ${text.slice(0, 300)}`,
    );
  }

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;

  if (typeof text !== 'string' || !text.trim()) {
    throw new ApiError(502, 'Vision model returned an unexpected response');
  }

  return text.trim();
}

async function describeImageWithAnthropic(
  model: string,
  apiKey: string,
  image: AiImageInput,
  userMessage: string,
  fetchWithTimeout: (url: string, init: RequestInit) => Promise<Response>,
  configService: ConfigService,
): Promise<string> {
  const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: Number(configService.get('AI_VISION_MAX_OUTPUT_TOKENS') ?? 600),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: image.contentType,
                data: image.data,
              },
            },
            {
              type: 'text',
              text: buildImageDescriptionPrompt(userMessage),
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(
      502,
      `Vision model error (${res.status}): ${text.slice(0, 300)}`,
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
    throw new ApiError(502, 'Vision model returned an unexpected response');
  }

  return text;
}
