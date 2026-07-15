export interface AiImageInput {
  contentType: string;
  data?: string;
  url?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatParams {
  systemPrompt: string;
  userMessage: string;
  image?: AiImageInput;
  conversationHistory?: ConversationMessage[];
}

export interface AiChatResult {
  raw: string;
}
