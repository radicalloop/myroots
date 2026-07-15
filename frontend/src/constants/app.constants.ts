export const ROUTES = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  TREE: (treeId: string) => `/tree/${treeId}`,
  ACCEPT_SHARE: (token: string) => `/accept-share/${token}`,
} as const;

export const QUERY_KEYS = {
  ME: ['me'] as const,
  TREES: ['trees'] as const,
  TREE: (id: string) => ['trees', id] as const,
  TREE_VIEW: (id: string) => ['tree-view', id] as const,
  TREE_SHARES: (id: string) => ['tree-shares', id] as const,
  PERSONS: (treeId: string) => ['persons', treeId] as const,
  PERSON_IMAGE: (treeId: string, personId: string, profileImagePath: string | null) =>
    ['person-image', treeId, personId, profileImagePath ?? 'none'] as const,
  PERSON_IMAGE_PREFIX: (treeId: string, personId: string) =>
    ['person-image', treeId, personId] as const,
} as const;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'family_tree_access_token',
} as const;
