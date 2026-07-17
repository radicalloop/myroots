import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const QUERY_KEYS = {
  ME: ['me'] as const,
  TREES: ['trees'] as const,
  TREE_VIEW: (id: string) => ['tree-view', id] as const,
  TREE_SHARES: (id: string) => ['tree-shares', id] as const,
  PERSONS: (treeId: string) => ['persons', treeId] as const,
  PERSON_IMAGE: (treeId: string, personId: string, profileImagePath: string | null) =>
    ['person-image', treeId, personId, profileImagePath ?? 'none'] as const
} as const;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'family_tree_access_token',
  PUBLIC_AUTH_PROMPT_DISMISSED_AT: 'myroots_public_auth_prompt_dismissed_at'
} as const;

const DEFAULT_API_URL = 'http://localhost:3001/api';

function getExpoDevHost(): string | null {
  const expoConfigHost = (Constants.expoConfig as { hostUri?: string } | null)?.hostUri;
  const manifestHost = (Constants.manifest as { debuggerHost?: string; hostUri?: string } | null)?.debuggerHost ??
    (Constants.manifest as { debuggerHost?: string; hostUri?: string } | null)?.hostUri;
  const host = expoConfigHost ?? manifestHost;

  return host?.split(':')[0] ?? null;
}

function getMobileApiUrl(configuredUrl: string): string {
  try {
    const url = new URL(configuredUrl);
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';

    if (!isLocalhost || Platform.OS === 'web') {
      return configuredUrl;
    }

    const devHost = getExpoDevHost();
    url.hostname = devHost ?? (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');
    return url.toString().replace(/\/$/, '');
  } catch {
    return configuredUrl;
  }
}

export const CONFIG = {
  appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
  apiUrl: getMobileApiUrl(process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL),
  publicWebUrl: process.env.EXPO_PUBLIC_PUBLIC_WEB_URL ?? 'http://localhost:5173'
} as const;
