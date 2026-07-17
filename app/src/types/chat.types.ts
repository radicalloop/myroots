export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  imageUrl?: string;
}

export interface ChatImagePayload {
  mimeType: string;
  base64: string;
}

export type ChatAction =
  | 'NONE'
  | 'ADD_PERSON'
  | 'UPDATE_PERSON'
  | 'ADD_PARENT'
  | 'ADD_SPOUSE'
  | 'BULK_UPDATE_PERSONS'
  | 'BATCH';

export interface SendChatMessagePayload {
  message: string;
  image?: ChatImagePayload;
  previousMessages?: { role: string; content: string }[];
}

export interface ChatResponse {
  reply: string;
  action: ChatAction;
  person: { id: string } | null;
  focus_person: { id: string } | null;
  results?: {
    action: ChatAction;
    person: { id: string } | null;
    success: boolean;
    error?: string;
  }[];
}
