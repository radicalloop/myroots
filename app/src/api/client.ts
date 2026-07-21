import { create, isAxiosError } from 'axios';
import { CONFIG, STORAGE_KEYS } from '@/constants/app.constants';
import { secureStorage } from '@/services/secureStorage';

export const api = create({
  baseURL: CONFIG.apiUrl,
  timeout: 30000
});

api.interceptors.request.use(async (config) => {
  const token = await secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join('\n');
    if (typeof message === 'string') return message;
    if (error.message) return error.message;
  }

  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}
