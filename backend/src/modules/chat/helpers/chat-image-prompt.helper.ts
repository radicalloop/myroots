export function buildDeepSeekImageUserMessage(
  imageUrl: string,
  message: string,
): string {
  return `The user attached an image at this URL:
${imageUrl}

User message:
${message}`;
}
