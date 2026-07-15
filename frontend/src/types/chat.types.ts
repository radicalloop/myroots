import { Person } from './api.types';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  imageUrl?: string;
  createdAt: string;
}

export interface ChatImagePayload {
  data: string; // base64, no "data:...;base64," prefix
  content_type: string;
}

export interface PreviousMessage {
  role: ChatRole;
  content: string;
}

export interface SendChatMessagePayload {
  message: string;
  image?: ChatImagePayload;
  previousMessages?: PreviousMessage[];
}

export type ChatAction = 'NONE' | 'ADD_PERSON' | 'UPDATE_PERSON' | 'ADD_SPOUSE' | 'ADD_PARENT' | 'BULK_UPDATE_PERSONS' | 'BATCH';

export interface ChatActionResult {
  action: ChatAction;
  person: Person | null;
  success: boolean;
  error?: string;
  /** Number of records affected (for bulk actions). */
  updatedCount?: number;
}

export interface ChatResponse {
  reply: string;
  action: ChatAction;
  person: Person | null;
  focus_person: Person | null;
  results?: ChatActionResult[];
}
