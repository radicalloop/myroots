import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  login,
  signup,
  getMe,
  updateMe,
  getTrees,
  createTree,
  updateTree,
  deleteTree,
  getTreeView,
  createPerson,
  addParent,
  addSpouse,
  removeSpouse,
  updatePerson,
  deletePerson,
  uploadPersonImageFile,
  deletePersonImage,
  createTreeShare,
  getTreeShares,
  updateTreeShare,
  deleteTreeShare,
  acceptShare,
  getPublicTreeView,
} from '@/api/family-tree.api';
import { QUERY_KEYS, ROUTES } from '@/constants/app.constants';
import { useAuth } from '@/providers/AuthProvider';
import { getErrorMessage } from '@/lib/axios';
import {
  CreatePersonPayload,
  AddParentPayload,
  AddSpousePayload,
  UpdatePersonPayload,
  Person,
  TreeView,
} from '@/types/api.types';
import { updatePersonInTree, personToTreeUpdates } from '@/utils/tree.utils';
import { revokePersonImageQueries } from '@/hooks/api/usePersonImageUrl';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image preview'));
      }
    });
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(file);
  });
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
    retry: false,
  });
}

export function useLogin() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
    ROUTES.DASHBOARD;

  return useMutation({
    mutationFn: login,
    onSuccess: (res) => {
      const { accessToken, user } = res.data.data;
      setAuth(accessToken, user);
      toast.success('Logged in successfully');
      navigate(redirectTo);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useSignup() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
    ROUTES.DASHBOARD;

  return useMutation({
    mutationFn: signup,
    onSuccess: (res) => {
      const { accessToken, user } = res.data.data;
      setAuth(accessToken, user);
      toast.success('Account created successfully');
      navigate(redirectTo);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateProfile() {
  const { setUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMe,
    onSuccess: (res) => {
      const user = res.data.data;
      setUser(user);
      queryClient.setQueryData(QUERY_KEYS.ME, user);
      toast.success('Profile updated successfully');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useTrees() {
  return useQuery({
    queryKey: QUERY_KEYS.TREES,
    queryFn: async () => {
      const res = await getTrees();
      return res.data.data;
    },
  });
}

export function useCreateTree() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTree,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TREES });
      toast.success('Tree created successfully');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateTree() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      treeId,
      data,
    }: {
      treeId: string;
      data: { name?: string; description?: string };
    }) => updateTree(treeId, data),
    onSuccess: (res, variables) => {
      queryClient.setQueryData<TreeView | undefined>(
        QUERY_KEYS.TREE_VIEW(variables.treeId),
        (current) => {
          if (!current) return current;

          return {
            ...current,
            tree: {
              ...current.tree,
              name: res.data.data.name,
            },
          };
        },
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TREES });
      toast.success('Tree updated successfully');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteTree() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (treeId: string) => deleteTree(treeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TREES });
      toast.success('Tree deleted successfully');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useTreeView(treeId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEYS.TREE_VIEW(treeId),
    queryFn: async () => {
      const res = await getTreeView(treeId);
      return res.data.data;
    },
    enabled: options?.enabled ?? Boolean(treeId),
  });
}

export function useCreatePerson(treeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePersonPayload) => createPerson(treeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TREE_VIEW(treeId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PERSONS(treeId) });
      toast.success('Person added successfully');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useAddParent(treeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      personId,
      data,
    }: {
      personId: string;
      data: AddParentPayload;
    }) => addParent(treeId, personId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TREE_VIEW(treeId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PERSONS(treeId) });
      toast.success('Parent added successfully');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useAddSpouse(treeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      personId,
      data,
    }: {
      personId: string;
      data: AddSpousePayload;
    }) => addSpouse(treeId, personId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TREE_VIEW(treeId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PERSONS(treeId) });
      toast.success('Spouse added successfully');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useRemoveSpouse(treeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (personId: string) => removeSpouse(treeId, personId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TREE_VIEW(treeId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PERSONS(treeId) });
      toast.success('Spouse removed successfully');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdatePerson(treeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      personId,
      data,
    }: {
      personId: string;
      data: UpdatePersonPayload;
    }) => {
      const res = await updatePerson(treeId, personId, data);
      return res.data.data;
    },
    onMutate: async ({ personId, data }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.TREE_VIEW(treeId) });

      const previous = queryClient.getQueryData<TreeView>(
        QUERY_KEYS.TREE_VIEW(treeId),
      );

      queryClient.setQueryData<TreeView | undefined>(
        QUERY_KEYS.TREE_VIEW(treeId),
        (current) => {
          if (!current?.root) return current;

          return {
            ...current,
            root: updatePersonInTree(current.root, personId, data),
          };
        },
      );

      return { previous };
    },
    onSuccess: (updatedPerson, { personId }) => {
      queryClient.setQueryData<TreeView | undefined>(
        QUERY_KEYS.TREE_VIEW(treeId),
        (current) => {
          if (!current?.root) return current;

          return {
            ...current,
            root: updatePersonInTree(
              current.root,
              personId,
              personToTreeUpdates(updatedPerson),
            ),
          };
        },
      );

      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TREE_VIEW(treeId) });
      toast.success('Person updated successfully');
    },
    onError: (err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.TREE_VIEW(treeId), context.previous);
      }
      toast.error(getErrorMessage(err));
    },
  });
}

export function useDeletePerson(treeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      personId,
      mode = 'person',
    }: {
      personId: string;
      mode?: 'person' | 'branch';
    }) => deletePerson(treeId, personId, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TREE_VIEW(treeId) });
      toast.success('Person deleted successfully');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUploadPersonImage(treeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      personId,
      file,
    }: {
      personId: string;
      file: File;
    }) => {
      const res = await uploadPersonImageFile(treeId, personId, file);
      return res.data.data;
    },
    onSuccess: async (updatedPerson, variables) => {
      const { personId, file } = variables;
      const newPath = updatedPerson.profile_image_path;

      queryClient.setQueryData<TreeView | undefined>(
        QUERY_KEYS.TREE_VIEW(treeId),
        (current) => {
          if (!current?.root) return current;

          return {
            ...current,
            root: updatePersonInTree(current.root, personId, {
              profile_image_path: newPath,
            }),
          };
        },
      );

      revokePersonImageQueries(queryClient, treeId, personId);

      if (newPath) {
        const previewUrl = await fileToDataUrl(file).catch(() => null);

        if (previewUrl) {
          queryClient.setQueryData(
            QUERY_KEYS.PERSON_IMAGE(treeId, personId, newPath),
            previewUrl,
          );
        }
      }

      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TREE_VIEW(treeId),
      });
      toast.success('Image uploaded successfully');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeletePersonImage(treeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (personId: string) => {
      const res = await deletePersonImage(treeId, personId);
      return res.data.data;
    },
    onSuccess: (updatedPerson: Person, personId) => {
      queryClient.setQueryData<TreeView | undefined>(
        QUERY_KEYS.TREE_VIEW(treeId),
        (current) => {
          if (!current?.root) return current;

          return {
            ...current,
            root: updatePersonInTree(current.root, personId, {
              profile_image_path: updatedPerson.profile_image_path,
            }),
          };
        },
      );

      revokePersonImageQueries(queryClient, treeId, personId);

      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TREE_VIEW(treeId),
      });
      toast.success('Image removed successfully');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

// ─── Share hooks ─────────────────────────────────────────────────────────

export function useTreeShares(treeId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.TREE_SHARES(treeId),
    queryFn: async () => {
      const res = await getTreeShares(treeId);
      return res.data.data;
    },
    enabled: Boolean(treeId),
  });
}

export function useCreateTreeShare(treeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { sharedWithEmail: string; permission: 'VIEW' | 'EDIT' }) =>
      createTreeShare(treeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TREE_SHARES(treeId),
      });
      toast.success('Share invite sent');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateTreeShare(treeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shareId,
      data,
    }: {
      shareId: string;
      data: { permission: 'VIEW' | 'EDIT' };
    }) => updateTreeShare(treeId, shareId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TREE_SHARES(treeId),
      });
      toast.success('Share updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteTreeShare(treeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shareId: string) => deleteTreeShare(treeId, shareId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TREE_SHARES(treeId),
      });
      toast.success('Share removed');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useAcceptShare() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (token: string) => acceptShare(token),
    onSuccess: (res) => {
      toast.success('Tree shared with you successfully');
      navigate(ROUTES.TREE(res.data.data.treeId));
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

// ─── Public tree view (no auth) ──────────────────────────────────────────

export function usePublicTreeView(treeId: string) {
  return useQuery({
    queryKey: ['public-tree-view', treeId],
    queryFn: async () => {
      const res = await getPublicTreeView(treeId);
      return res.data.data;
    },
    enabled: Boolean(treeId),
  });
}
