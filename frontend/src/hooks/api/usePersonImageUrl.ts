import { useEffect } from 'react';
import {
  QueryClient,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { fetchPersonImageBlob, fetchPublicPersonImageBlob } from '@/api/family-tree.api';
import { QUERY_KEYS } from '@/constants/app.constants';
import { useTreePublicContext } from '@/contexts/TreePublicContext';

interface UsePersonImageUrlOptions {
  treeId: string;
  personId: string;
  profileImagePath: string | null;
}

function revokeIfBlobUrl(url: unknown): void {
  if (typeof url === 'string' && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

export function usePersonImageUrl({
  treeId,
  personId,
  profileImagePath,
}: UsePersonImageUrlOptions) {
  const queryClient = useQueryClient();
  const { isPublic } = useTreePublicContext();

  const query = useQuery({
    queryKey: [
      ...(isPublic ? ['public'] : []),
      ...QUERY_KEYS.PERSON_IMAGE(treeId, personId, profileImagePath),
    ],
    queryFn: async ({ queryKey }) => {
      const previousUrl = queryClient.getQueryData<string>(queryKey);
      const fetchFn = isPublic ? fetchPublicPersonImageBlob : fetchPersonImageBlob;
      const res = await fetchFn(
        treeId,
        personId,
        profileImagePath!,
      );
      const nextUrl = URL.createObjectURL(res.data);

      // Only revoke after a successful replacement so remounts never
      // receive a dead blob URL from the query cache.
      if (previousUrl && previousUrl !== nextUrl) {
        revokeIfBlobUrl(previousUrl);
      }

      return nextUrl;
    },
    enabled: Boolean(treeId && personId && profileImagePath),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    retry: false,
  });

  useEffect(() => {
    if (
      query.isError &&
      isAxiosError(query.error) &&
      query.error.response?.status === 404
    ) {
      const invalidateKey = isPublic
        ? ['public-tree-view', treeId]
        : QUERY_KEYS.TREE_VIEW(treeId);
      queryClient.invalidateQueries({ queryKey: invalidateKey });
    }
  }, [query.isError, query.error, queryClient, treeId, isPublic]);

  return query;
}

export function revokePersonImageQueries(
  queryClient: QueryClient,
  treeId: string,
  personId: string,
): void {
  const queries = queryClient.getQueriesData<string>({
    queryKey: QUERY_KEYS.PERSON_IMAGE_PREFIX(treeId, personId),
  });

  for (const [, url] of queries) {
    revokeIfBlobUrl(url);
  }

  queryClient.removeQueries({
    queryKey: QUERY_KEYS.PERSON_IMAGE_PREFIX(treeId, personId),
  });
}
