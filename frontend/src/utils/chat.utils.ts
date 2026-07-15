import { ChatMessage } from '@/types/chat.types';

export function createChatMessage(
  role: ChatMessage['role'],
  content: string,
  imageUrl?: string,
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    imageUrl,
    createdAt: new Date().toISOString(),
  };
}

export function getWelcomeMessage(treeName?: string): ChatMessage {
  const intro = treeName
    ? `Hi! I can help you explore this tree — ask about people, add someone new, or edit details.`
    : 'Hi! Open a family tree to chat with me about it — I can answer questions, add people, and edit details.';

  return createChatMessage('assistant', intro);
}

const MAX_CHAT_IMAGE_BYTES = 6 * 1024 * 1024;

/**
 * Converts an image File to the { data, content_type } shape the chat API
 * expects (base64 payload without the "data:...;base64," prefix).
 */
export async function fileToChatImagePayload(
  file: File,
): Promise<{ data: string; content_type: string }> {
  if (file.size > MAX_CHAT_IMAGE_BYTES) {
    throw new Error('Image is too large (max 6MB)');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read image file'));
    reader.readAsDataURL(file);
  });

  const [, base64 = ''] = dataUrl.split(',');

  return { data: base64, content_type: file.type };
}

/**
 * If the message content is valid JSON (which means the backend failed to
 * parse the AI response), replace it with a user-friendly fallback instead of
 * displaying raw braces and keys in the chat bubble.
 */
export function sanitizeAssistantMessage(content: string): string {
  const trimmed = content.trim();

  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      JSON.parse(trimmed);
      return "Sorry, I couldn't understand the response. Please try again.";
    } catch {
      // Not valid JSON — it's a natural message that happens to have braces.
    }
  }

  return content;
}

export function buildChatImageDataUrl(
  image: { data: string; content_type: string },
): string {
  return `data:${image.content_type};base64,${image.data}`;
}
