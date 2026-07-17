export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface Tree {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  counts?: {
    men: number;
    women: number;
    total: number;
  };
  role?: 'OWNER' | 'VIEW' | 'EDIT';
  sharedByEmail?: string;
  created_at: string;
  updated_at: string;
}

export interface TreeShare {
  id: string;
  treeId: string;
  sharedWithEmail: string;
  permission: 'VIEW' | 'EDIT';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  token: string;
  createdAt: string;
}

export interface AcceptShareResponse {
  id: string;
  treeId: string;
  treeName: string;
  permission: 'VIEW' | 'EDIT';
}

export interface Person {
  id: string;
  tree_id: string;
  parent_id: string | null;
  first_name: string;
  last_name: string;
  gender: Gender;
  birth_date: string | null;
  death_date: string | null;
  birth_place: string | null;
  current_place: string | null;
  health_note: string | null;
  profile_image_path: string | null;
  profile_image_url?: string | null;
  is_root: boolean;
  spouse: Person | null;
  created_at: string;
  updated_at: string;
}

export interface TreePersonNode extends Person {
  children: TreePersonNode[];
  spouse: TreePersonNode | null;
}

export interface TreeView {
  tree: Pick<Tree, 'id' | 'name' | 'description'> & {
    role?: 'OWNER' | 'VIEW' | 'EDIT';
  };
  root: TreePersonNode | null;
}

export interface ImageUploadResponse {
  upload_url: string;
  object_path: string;
}

export interface PersonImageResponse {
  image_url: string;
}

export interface CreatePersonPayload {
  first_name: string;
  last_name: string;
  gender: Gender;
  birth_date?: string | null;
  death_date?: string | null;
  birth_place?: string | null;
  current_place?: string | null;
  health_note?: string | null;
  is_root: boolean;
  parent_id?: string | null;
}

export interface AddParentPayload {
  first_name: string;
  last_name: string;
  gender: Gender;
  birth_date?: string | null;
  death_date?: string | null;
  birth_place?: string | null;
  current_place?: string | null;
  health_note?: string | null;
}

export interface AddSpousePayload {
  first_name?: string;
  last_name?: string;
  gender?: Gender;
  birth_date?: string | null;
  death_date?: string | null;
  birth_place?: string | null;
  current_place?: string | null;
  health_note?: string | null;
  existing_person_id?: string | null;
}

export interface UpdatePersonPayload {
  first_name?: string;
  last_name?: string;
  gender?: Gender;
  birth_date?: string | null;
  death_date?: string | null;
  birth_place?: string | null;
  current_place?: string | null;
  health_note?: string | null;
}
