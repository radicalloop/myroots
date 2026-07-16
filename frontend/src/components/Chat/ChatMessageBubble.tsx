import clsx from "clsx";
import { ReactNode } from "react";
import { ChatMessage } from "@/types/chat.types";
import { sanitizeAssistantMessage } from "@/utils/chat.utils";
import { Sparkles } from "lucide-react";

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === "user";
  const content = isUser
    ? message.content
    : sanitizeAssistantMessage(message.content);

  return (
    <div
      className={clsx("flex gap-2", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        </div>
      )}
      <div
        className={clsx(
          "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ",
          isUser
            ? "rounded-br-md bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-sm"
            : "rounded-bl-md border border-border-subtle bg-white text-text-primary shadow-sm",
        )}
      >
        {message.imageUrl && (
          <img
            src={message.imageUrl}
            alt="Attached"
            className="mb-2 max-h-40 w-full rounded-xl border border-white/20 object-cover"
          />
        )}
        {content && (
          <MarkdownMessage content={content} inverted={isUser} />
        )}
      </div>
    </div>
  );
}

type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "ordered-list"; items: string[] }
  | { type: "unordered-list"; items: string[] }
  | { type: "code"; language?: string; text: string };

function MarkdownMessage({
  content,
  inverted = false,
}: {
  content: string;
  inverted?: boolean;
}) {
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="space-y-2 break-words">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const className = clsx(
            "font-semibold leading-snug",
            inverted ? "text-white" : "text-text-primary",
            block.level === 1 && "text-base",
            block.level === 2 && "text-[15px]",
            block.level === 3 && "text-sm",
          );

          return (
            <p key={index} className={className}>
              {renderInlineMarkdown(block.text, inverted)}
            </p>
          );
        }

        if (block.type === "code") {
          return (
            <pre
              key={index}
              className={clsx(
                "max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-xl border px-3 py-2 text-xs leading-relaxed",
                inverted
                  ? "border-white/15 bg-black/10 text-white"
                  : "border-border-subtle bg-warm-50 text-text-primary",
              )}
            >
              <code>{block.text}</code>
            </pre>
          );
        }

        if (block.type === "ordered-list") {
          return (
            <ol
              key={index}
              className={clsx(
                "ml-4 list-decimal space-y-1",
                inverted ? "marker:text-white/75" : "marker:text-text-muted",
              )}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="pl-1">
                  {renderInlineMarkdown(item, inverted)}
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === "unordered-list") {
          return (
            <ul
              key={index}
              className={clsx(
                "ml-4 list-disc space-y-1",
                inverted ? "marker:text-white/75" : "marker:text-text-muted",
              )}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="pl-1">
                  {renderInlineMarkdown(item, inverted)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index} className="whitespace-pre-wrap">
            {renderInlineMarkdown(block.text, inverted)}
          </p>
        );
      })}
    </div>
  );
}

function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  if (looksLikeRawCode(content)) {
    return [{ type: "code", text: content.trim() }];
  }

  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let orderedItems: string[] = [];
  let unorderedItems: string[] = [];
  let codeLines: string[] = [];
  let codeLanguage: string | undefined;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ type: "paragraph", text: paragraph.join("\n") });
    paragraph = [];
  };

  const flushOrderedList = () => {
    if (orderedItems.length === 0) return;
    blocks.push({ type: "ordered-list", items: orderedItems });
    orderedItems = [];
  };

  const flushUnorderedList = () => {
    if (unorderedItems.length === 0) return;
    blocks.push({ type: "unordered-list", items: unorderedItems });
    unorderedItems = [];
  };

  const flushLists = () => {
    flushOrderedList();
    flushUnorderedList();
  };

  const flushCode = () => {
    if (codeLines.length === 0 && codeLanguage === undefined) return;
    blocks.push({
      type: "code",
      language: codeLanguage,
      text: codeLines.join("\n"),
    });
    codeLines = [];
    codeLanguage = undefined;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    const fenceMatch = trimmed.match(/^```(\w+)?\s*$/);
    if (fenceMatch) {
      if (codeLanguage !== undefined || codeLines.length > 0) {
        flushCode();
      } else {
        flushParagraph();
        flushLists();
        codeLanguage = fenceMatch[1] ?? "";
      }
      continue;
    }

    if (codeLanguage !== undefined) {
      codeLines.push(line);
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      flushLists();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushLists();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2],
      });
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph();
      flushUnorderedList();
      orderedItems.push(orderedMatch[1]);
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (unorderedMatch) {
      flushParagraph();
      flushOrderedList();
      unorderedItems.push(unorderedMatch[1]);
      continue;
    }

    flushLists();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushLists();
  flushCode();

  return blocks.length > 0 ? blocks : [{ type: "paragraph", text: content }];
}

function looksLikeRawCode(content: string): boolean {
  const trimmed = content.trim();

  return (
    ((trimmed.startsWith("{") && trimmed.includes('":')) ||
      (trimmed.startsWith("[") && trimmed.includes('":'))) &&
    trimmed.length > 80
  );
}

function renderInlineMarkdown(text: string, inverted: boolean): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${match.index}-${token}`;

    if (token.startsWith("`")) {
      parts.push(
        <code
          key={key}
          className={clsx(
            "rounded px-1 py-0.5 text-[0.92em]",
            inverted
              ? "bg-white/15 text-white"
              : "bg-warm-100 text-text-primary",
          )}
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      parts.push(
        <strong
          key={key}
          className={clsx("font-semibold", inverted ? "text-white" : "text-text-primary")}
        >
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      parts.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-border-subtle bg-white px-4 py-3 shadow-sm">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:300ms]" />
      </div>
    </div>
  );
}

export { TypingIndicator };
