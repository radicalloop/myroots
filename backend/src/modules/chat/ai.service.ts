import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiError } from '../../utils/ApiError';
import {
  callAnthropic,
  callOpenAiCompatible,
  OPENAI_COMPATIBLE_BASE_URLS,
} from './helpers/ai-provider.helper';
import { buildDeepSeekImageUserMessage } from './helpers/chat-image-prompt.helper';
import { providerSupportsVision } from './helpers/ai-vision.helper';
import { AiChatParams, AiChatResult } from './types/ai.types';

export type { AiChatParams, AiChatResult, AiImageInput } from './types/ai.types';

interface ProviderConfig {
  provider: string;
  model: string;
}

@Injectable()
export class AiService {
  constructor(private readonly configService: ConfigService) {}

  async callAi(params: AiChatParams): Promise<AiChatResult> {
    const { provider, model } = this.getProviderConfig();
    const apiKey = this.getApiKey();
    const resolvedParams = await this.resolveParamsForProvider(provider, params);
    const fetcher = (url: string, init: RequestInit) =>
      this.fetchWithTimeout(url, init);

    if (provider === 'anthropic' || provider === 'claude') {
      return {
        raw: await callAnthropic(
          model,
          apiKey,
          resolvedParams,
          fetcher,
          this.getMaxOutputTokens(),
        ),
      };
    }

    const builtInBaseUrl = OPENAI_COMPATIBLE_BASE_URLS[provider];
    const baseUrl =
      builtInBaseUrl ?? this.configService.get<string>('AI_BASE_URL');

    if (baseUrl) {
      return {
        raw: await callOpenAiCompatible(
          baseUrl,
          model,
          apiKey,
          resolvedParams,
          fetcher,
          this.getMaxOutputTokens(),
        ),
      };
    }

    throw new ApiError(
      500,
      `Unsupported AI provider "${provider}". Built-in support: openai, anthropic (or claude), deepseek, groq, together, mistral. ` +
        'For any other OpenAI-compatible provider, also set AI_BASE_URL.',
    );
  }

  private async resolveParamsForProvider(
    provider: string,
    params: AiChatParams,
  ): Promise<AiChatParams> {
    if (!params.image) return params;

    if (providerSupportsVision(provider)) {
      return params;
    }

    if (params.image.url) {
      return {
        systemPrompt: params.systemPrompt,
        userMessage: buildDeepSeekImageUserMessage(
          params.image.url,
          params.userMessage,
        ),
      };
    }

    throw new ApiError(
      400,
      'DeepSeek cannot read raw image data. Chat images must be uploaded to S3 ' +
        'and sent as a public URL in the message text.',
    );
  }

  private getProviderConfig(): ProviderConfig {
    const modal = this.configService.get<string>('AI_MODAL');
    if (!modal) {
      throw new ApiError(500, 'AI_MODAL is not configured');
    }

    const separatorIndex = modal.indexOf(':');
    if (separatorIndex === -1) {
      throw new ApiError(
        500,
        'AI_MODAL must be in the format "provider:model", e.g. "openai:gpt-4o-mini"',
      );
    }

    const provider = modal.slice(0, separatorIndex).trim().toLowerCase();
    const model = modal.slice(separatorIndex + 1).trim();

    if (!provider || !model) {
      throw new ApiError(
        500,
        'AI_MODAL must be in the format "provider:model", e.g. "openai:gpt-4o-mini"',
      );
    }

    return { provider, model };
  }

  private getApiKey(): string {
    const key = this.configService.get<string>('AI_API_KEY');
    if (!key) {
      throw new ApiError(500, 'AI_API_KEY is not configured');
    }
    return key;
  }

  private getTimeoutMs(): number {
    return Number(this.configService.get('AI_REQUEST_TIMEOUT_MS') ?? 30000);
  }

  private getMaxOutputTokens(): number {
    return Number(this.configService.get('AI_MAX_OUTPUT_TOKENS') ?? 2000);
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.getTimeoutMs());

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(504, 'AI provider request timed out');
      }
      throw new ApiError(502, 'Failed to reach AI provider');
    } finally {
      clearTimeout(timeout);
    }
  }
}
