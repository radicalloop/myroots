import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  acceptShare,
  addParent,
  addSpouse,
  confirmPersonImage,
  createPerson,
  createTree,
  createTreeShare,
  deletePerson,
  deletePersonImage,
  deleteTree,
  deleteTreeShare,
  getImageUploadUrl,
  getMe,
  getPublicTreeView,
  getTreeShares,
  getTrees,
  getTreeView,
  login,
  removeSpouse,
  sendChatMessage,
  sendPublicChatMessage,
  signup,
  updateMe,
  updatePerson,
  updateTree,
  updateTreeShare,
  uploadPersonImageFile
} from '@/api/family-tree.api';
import { getErrorMessage } from '@/api/client';
import { QUERY_KEYS } from '@/constants/app.constants';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';
import {
  AddParentPayload,
  AddSpousePayload,
  CreatePersonPayload,
  Person,
  TreeView,
  UpdatePersonPayload
} from '@/types/api.types';
import { ChatImagePayload } from '@/types/chat.types';
import { personToTreeUpdates, updatePersonInTree } from '@/utils/tree.utils';

function mutationError(showToast: (message: string, kind?: 'success' | 'error' | 'info') => void) {
  return (error: unknown) => showToast(getErrorMessage(error), 'error');
}

export function useMe(options?: { enabled?: boolean }) {
  const { setUser, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.ME,
    queryFn: async () => {
      const res = await getMe();
      setUser(res.data.data);
      return res.data.data;
    },
    enabled: (options?.enabled ?? true) && isAuthenticated,
    retry: false
  });
}

export function useLogin() {
  const { setAuth } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: login,
    onSuccess: async (res) => {
      const { accessToken, user } = res.data.data;
      await setAuth(accessToken, user);
      showToast('Logged in successfully', 'success');
      router.replace('/dashboard');
    },
    onError: mutationError(showToast)
  });
}

export function useSignup() {
  const { setAuth } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: signup,
    onSuccess: async (res) => {
      const { accessToken, user } = res.data.data;
      await setAuth(accessToken, user);
      showToast('Account created successfully', 'success');
      router.replace('/dashboard');
    },
    onError: mutationError(showToast)
  });
}

export function useLogout() {
  const { clearAuth } = useAuth();
  const queryClient = useQueryClient();

  return async () => {
    await clearAuth();
    queryClient.clear();
    router.replace('/login');
  };
}

export function useUpdateProfile() {
  const { setUser } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: updateMe,
    onSuccess: (res) => {
      const user = res.data.data;
      setUser(user);
      queryClient.setQueryData(QUERY_KEYS.ME, user);
      showToast('Profile updated successfully', 'success');
    },
    onError: mutationError(showToast)
  });
}

export function useTrees() {
  return useQuery({
    queryKey: QUERY_KEYS.TREES,
    queryFn: async () => {
      const res = await getTrees();
      return res.data.data;
    }
  });
}

export function useCreateTree() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: createTree,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TREES });
      showToast('Tree created successfully', 'success');
    },
    onError: mutationError(showToast)
  });
}

export function useUpdateTree() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ treeId, data }: { treeId: string; data: { name?: string; description?: string } }) =>
      updateTree(treeId, data),
    onSuccess: (res, variables) => {
      queryClient.setQueryData<TreeView | undefined>(QUERY_KEYS.TREE_VIEW(variables.treeId), (current) =>
        current ? { ...current, tree: { ...current.tree, name: res.data.data.name } } : current
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TREES });
      showToast('Tree updated successfully', 'success');
    },
    onError: mutationError(showToast)
  });
}

export function useDeleteTree() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (treeId: string) => deleteTree(treeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TREES });
      showToast('Tree deleted successfully', 'success');
    },
    onError: mutationError(showToast)
  });
}

export function useTreeView(treeId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEYS.TREE_VIEW(treeId),
    queryFn: async () => {
      const res = await getTreeView(treeId);
      return res.data.data;
    },
    enabled: options?.enabled ?? Boolean(treeId)
  });
}

export function usePublicTreeView(treeId: string) {
  return useQuery({
    queryKey: ['public-tree-view', treeId],
    queryFn: async () => {
      const res = await getPublicTreeView(treeId);
      return res.data.data;
    },
    enabled: Boolean(treeId)
  });
}

export function useCreatePerson(treeId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (data: CreatePersonPayload) => createPerson(treeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TREE_VIEW(treeId) });
      showToast('Person added successfully', 'success');
    },
    onError: mutationError(showToast)
  });
}

export function useAddParent(treeId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ personId, data }: { personId: string; data: AddParentPayload }) => addParent(treeId, personId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TREE_VIEW(treeId) });
      showToast('Parent added successfully', 'success');
    },
    onError: mutationError(showToast)
  });
}

export function useAddSpouse(treeId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ personId, data }: { personId: string; data: AddSpousePayload }) => addSpouse(treeId, personId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TREE_VIEW(treeId) });
      showToast('Spouse added successfully', 'success');
    },
    onError: mutationError(showToast)
  });
}

export function useRemoveSpouse(treeId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (personId: string) => removeSpouse(treeId, personId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TREE_VIEW(treeId) });
      showToast('Spouse removed successfully', 'success');
    },
    onError: mutationError(showToast)
  });
}

export function useUpdatePerson(treeId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ personId, data }: { personId: string; data: UpdatePersonPayload }) => {
      const res = await updatePerson(treeId, personId, data);
      return res.data.data;
    },
    onMutate: async ({ personId, data }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.TREE_VIEW(treeId) });
      const previous = queryClient.getQueryData<TreeView>(QUERY_KEYS.TREE_VIEW(treeId));
      queryClient.setQueryData<TreeView | undefined>(QUERY_KEYS.TREE_VIEW(treeId), (current) =>
        current?.root ? { ...current, root: updatePersonInTree(current.root, personId, data) } : current
      );
      return { previous };
    },
    onSuccess: (updatedPerson, { personId }) => {
      queryClient.setQueryData<TreeView | undefined>(QUERY_KEYS.TREE_VIEW(treeId), (current) =>
        current?.root
          ? { ...current, root: updatePersonInTree(current.root, personId, personToTreeUpdates(updatedPerson)) }
          : current
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TREE_VIEW(treeId) });
      showToast('Person updated successfully', 'success');
    },
    onError: (err, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEYS.TREE_VIEW(treeId), context.previous);
      showToast(getErrorMessage(err), 'error');
    }
  });
}

export function useDeletePerson(treeId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ personId, mode = 'person' }: { personId: string; mode?: 'person' | 'branch' }) =>
      deletePerson(treeId, personId, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TREE_VIEW(treeId) });
      showToast('Person deleted successfully', 'success');
    },
    onError: mutationError(showToast)
  });
}

export function useUploadPersonImage(treeId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ personId, file }: { personId: string; file: { uri: string; mimeType: string; name: string; size?: number } }) => {
      try {
        const upload = await getImageUploadUrl(treeId, personId, {
          content_type: file.mimeType,
          file_size: file.size
        });

        await fetch(upload.data.data.upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': file.mimeType },
          body: file as unknown as BodyInit
        });

        const confirmed = await confirmPersonImage(treeId, personId, {
          object_path: upload.data.data.object_path
        });
        return confirmed.data.data;
      } catch {
        const fallback = await uploadPersonImageFile(treeId, personId, file);
        return fallback.data.data;
      }
    },
    onSuccess: (updatedPerson: Person, { personId }) => {
      queryClient.setQueryData<TreeView | undefined>(QUERY_KEYS.TREE_VIEW(treeId), (current) =>
        current?.root
          ? {
              ...current,
              root: updatePersonInTree(current.root, personId, {
                profile_image_path: updatedPerson.profile_image_path
              })
            }
          : current
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TREE_VIEW(treeId) });
      showToast('Image uploaded successfully', 'success');
    },
    onError: mutationError(showToast)
  });
}

export function useDeletePersonImage(treeId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (personId: string) => {
      const res = await deletePersonImage(treeId, personId);
      return res.data.data;
    },
    onSuccess: (updatedPerson, personId) => {
      queryClient.setQueryData<TreeView | undefined>(QUERY_KEYS.TREE_VIEW(treeId), (current) =>
        current?.root
          ? {
              ...current,
              root: updatePersonInTree(current.root, personId, {
                profile_image_path: updatedPerson.profile_image_path
              })
            }
          : current
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TREE_VIEW(treeId) });
      showToast('Image removed successfully', 'success');
    },
    onError: mutationError(showToast)
  });
}

export function useTreeShares(treeId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.TREE_SHARES(treeId),
    queryFn: async () => {
      const res = await getTreeShares(treeId);
      return res.data.data;
    },
    enabled: Boolean(treeId)
  });
}

export function useCreateTreeShare(treeId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (data: { sharedWithEmail: string; permission: 'VIEW' | 'EDIT' }) => createTreeShare(treeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TREE_SHARES(treeId) });
      showToast('Share invite sent', 'success');
    },
    onError: mutationError(showToast)
  });
}

export function useUpdateTreeShare(treeId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ shareId, data }: { shareId: string; data: { permission: 'VIEW' | 'EDIT' } }) =>
      updateTreeShare(treeId, shareId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TREE_SHARES(treeId) });
      showToast('Share updated', 'success');
    },
    onError: mutationError(showToast)
  });
}

export function useDeleteTreeShare(treeId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (shareId: string) => deleteTreeShare(treeId, shareId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TREE_SHARES(treeId) });
      showToast('Share removed', 'success');
    },
    onError: mutationError(showToast)
  });
}

export function useAcceptShare() {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (token: string) => acceptShare(token),
    onSuccess: (res) => {
      showToast('Tree shared with you successfully', 'success');
      router.replace(`/tree/${res.data.data.treeId}`);
    },
    onError: mutationError(showToast)
  });
}

export function useSendChat(treeId: string, publicMode = false) {
  return async (
    message: string,
    image?: ChatImagePayload,
    previousMessages?: { role: string; content: string }[]
  ) => {
    if (publicMode) {
      const res = await sendPublicChatMessage(treeId, { message, previousMessages });
      return { reply: res.data.data.reply };
    }

    const res = await sendChatMessage(treeId, { message, image, previousMessages });
    return res.data.data;
  };
}
