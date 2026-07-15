import { ApiError } from '../../../utils/ApiError';

export function parseAiModalProvider(modal: string, envName: string): string {
  const separatorIndex = modal.indexOf(':');
  if (separatorIndex === -1) {
    throw new ApiError(
      500,
      `${envName} must be in the format "provider:model", e.g. "deepseek:deepseek-v4-pro"`,
    );
  }

  const provider = modal.slice(0, separatorIndex).trim().toLowerCase();
  if (!provider) {
    throw new ApiError(
      500,
      `${envName} must be in the format "provider:model", e.g. "deepseek:deepseek-v4-pro"`,
    );
  }

  return provider;
}
