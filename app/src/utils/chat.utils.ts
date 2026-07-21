import { ChatImagePayload, ChatMessage, ChatRole } from '@/types/chat.types';

export function createChatMessage(role: ChatRole, content: string, imageUrl?: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    imageUrl
  };
}

export function getWelcomeMessage(treeName?: string): ChatMessage {
  return createChatMessage(
    'assistant',
    treeName
      ? `Hi, I can help update or explore ${treeName}.`
      : 'Hi, I can help update or explore this family tree.'
  );
}

export function buildChatImageDataUrl(image: ChatImagePayload): string {
  return `data:${image.mimeType};base64,${image.base64}`;
}

export function sanitizeAssistantMessage(message: string): string {
  return message.replace(/\n{3,}/g, '\n\n').trim();
}
