import { api } from '@/lib/axios';
import {
  ApiSuccessResponse,
  AuthResponse,
  User,
  Tree,
  TreeShare,
  AcceptShareResponse,
  Person,
  TreeView,
  CreatePersonPayload,
  AddParentPayload,
  AddSpousePayload,
  UpdatePersonPayload,
  ImageUploadResponse,
  PersonImageResponse,
} from '@/types/api.types';
import { SendChatMessagePayload, ChatResponse } from '@/types/chat.types';

export const signup = (data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}) =>
  api.post<ApiSuccessResponse<AuthResponse>>('/auth/signup', data);

export const login = (data: { email: string; password: string }) =>
  api.post<ApiSuccessResponse<AuthResponse>>('/auth/login', data);

export const getMe = () => api.get<ApiSuccessResponse<User>>('/auth/me');

export const updateMe = (data: { firstName: string; lastName: string }) =>
  api.patch<ApiSuccessResponse<User>>('/auth/me', data);

export const getTrees = () => api.get<ApiSuccessResponse<Tree[]>>('/trees');

export const createTree = (data: { name: string; description?: string }) =>
  api.post<ApiSuccessResponse<Tree>>('/trees', data);

export const updateTree = (
  treeId: string,
  data: { name?: string; description?: string },
) => api.patch<ApiSuccessResponse<Tree>>(`/trees/${treeId}`, data);

export const deleteTree = (treeId: string) =>
  api.delete<ApiSuccessResponse<null>>(`/trees/${treeId}`);

export const getTreeView = (treeId: string) =>
  api.get<ApiSuccessResponse<TreeView>>(`/trees/${treeId}/tree-view`);

export const getPersons = (treeId: string) =>
  api.get<ApiSuccessResponse<Person[]>>(`/trees/${treeId}/persons`);

export const createPerson = (treeId: string, data: CreatePersonPayload) =>
  api.post<ApiSuccessResponse<Person>>(`/trees/${treeId}/persons`, data);

export const addParent = (
  treeId: string,
  personId: string,
  data: AddParentPayload,
) =>
  api.post<ApiSuccessResponse<Person>>(
    `/trees/${treeId}/persons/${personId}/parent`,
    data,
  );

export const addSpouse = (
  treeId: string,
  personId: string,
  data: AddSpousePayload,
) =>
  api.post<ApiSuccessResponse<Person>>(
    `/trees/${treeId}/persons/${personId}/spouse`,
    data,
  );

export const removeSpouse = (treeId: string, personId: string) =>
  api.delete<ApiSuccessResponse<Person | null>>(
    `/trees/${treeId}/persons/${personId}/spouse`,
  );

export const updatePerson = (
  treeId: string,
  personId: string,
  data: UpdatePersonPayload,
) =>
  api.patch<ApiSuccessResponse<Person>>(
    `/trees/${treeId}/persons/${personId}`,
    data,
  );

export const deletePerson = (
  treeId: string,
  personId: string,
  mode: 'person' | 'branch' = 'person',
) =>
  api.delete<ApiSuccessResponse<null>>(
    `/trees/${treeId}/persons/${personId}`,
    { params: { mode } },
  );

export const fetchPersonImageBlob = (
  treeId: string,
  personId: string,
  profileImagePath: string,
) =>
  api.get(`/trees/${treeId}/persons/${personId}/image/view`, {
    responseType: 'blob',
    params: { v: profileImagePath },
  });

export const uploadPersonImageFile = async (
  treeId: string,
  personId: string,
  file: File,
) => {
  const data = await file.arrayBuffer();

  return api.post<ApiSuccessResponse<Person>>(
    `/trees/${treeId}/persons/${personId}/image/upload`,
    data,
    {
      headers: { 'Content-Type': file.type },
      transformRequest: [(body) => body],
    },
  );
};

export const getPersonImageUrl = (treeId: string, personId: string) =>
  api.get<ApiSuccessResponse<PersonImageResponse>>(
    `/trees/${treeId}/persons/${personId}/image`,
  );

export const getImageUploadUrl = (
  treeId: string,
  personId: string,
  data: { content_type: string; file_size?: number },
) =>
  api.post<ApiSuccessResponse<ImageUploadResponse>>(
    `/trees/${treeId}/persons/${personId}/image`,
    data,
  );

export const confirmPersonImage = (
  treeId: string,
  personId: string,
  data: { object_path: string },
) =>
  api.patch<ApiSuccessResponse<Person>>(
    `/trees/${treeId}/persons/${personId}/image`,
    data,
  );

export const deletePersonImage = (treeId: string, personId: string) =>
  api.delete<ApiSuccessResponse<Person>>(
    `/trees/${treeId}/persons/${personId}/image`,
  );

export const sendChatMessage = (
  treeId: string,
  data: SendChatMessagePayload,
) =>
  api.post<ApiSuccessResponse<ChatResponse>>(`/trees/${treeId}/chat`, data);

// ─── Public APIs (no auth required) ──────────────────────────────────────

export const getPublicTreeView = (treeId: string) =>
  api.get<ApiSuccessResponse<TreeView>>(`/public/trees/${treeId}`);

export const fetchPublicPersonImageBlob = (
  treeId: string,
  personId: string,
  profileImagePath: string,
) =>
  api.get(`/public/trees/${treeId}/persons/${personId}/image/view`, {
    responseType: 'blob',
    params: { v: profileImagePath },
  });

export const sendPublicChatMessage = (
  treeId: string,
  data: { message: string; previousMessages?: Array<{ role: string; content: string }> },
) =>
  api.post<ApiSuccessResponse<{ reply: string }>>(`/public/trees/${treeId}/chat`, data);

// ─── Share APIs ──────────────────────────────────────────────────────────

export const createTreeShare = (
  treeId: string,
  data: { sharedWithEmail: string; permission: 'VIEW' | 'EDIT' },
) =>
  api.post<ApiSuccessResponse<TreeShare>>(`/trees/${treeId}/shares`, data);

export const getTreeShares = (treeId: string) =>
  api.get<ApiSuccessResponse<TreeShare[]>>(`/trees/${treeId}/shares`);

export const updateTreeShare = (
  treeId: string,
  shareId: string,
  data: { permission: 'VIEW' | 'EDIT' },
) =>
  api.patch<ApiSuccessResponse<TreeShare>>(
    `/trees/${treeId}/shares/${shareId}`,
    data,
  );

export const deleteTreeShare = (treeId: string, shareId: string) =>
  api.delete<ApiSuccessResponse<null>>(`/trees/${treeId}/shares/${shareId}`);

export const acceptShare = (token: string) =>
  api.post<ApiSuccessResponse<AcceptShareResponse>>(`/share-accept/${token}`);
