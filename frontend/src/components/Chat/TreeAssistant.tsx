import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Sparkles, Upload } from "lucide-react";
import { ChatMessage, ChatImagePayload } from "@/types/chat.types";
import { fileToChatImagePayload } from "@/utils/chat.utils";
import { ChatMessageBubble, TypingIndicator } from "./ChatMessageBubble";
import { TreeAssistantComposer } from "./TreeAssistantComposer";
import { useImageDrop } from "@/hooks/useImageDrop";

interface TreeAssistantProps {
  messages: ChatMessage[];
  isSending: boolean;
  onSend: (message: string, image?: ChatImagePayload) => void;
  treeName?: string;
  onClose?: () => void;
}

export function TreeAssistant({
  messages,
  isSending,
  onSend,
  treeName,
  onClose,
}: TreeAssistantProps) {
  const [input, setInput] = useState("");
  const [attachedImage, setAttachedImage] = useState<{
    payload: ChatImagePayload;
    previewUrl: string;
    name: string;
  } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const processFile = useCallback(async (file: File) => {
    try {
      const payload = await fileToChatImagePayload(file);
      setAttachedImage({
        payload,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not attach image",
      );
    }
  }, []);

  const { dragActive, onDragEnter, onDragOver, onDragLeave, onDrop } =
    useImageDrop(processFile);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, isSending]);

  useEffect(() => {
    return () => {
      if (attachedImage) URL.revokeObjectURL(attachedImage.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    processFile(file);
  };

  const clearAttachedImage = () => {
    if (attachedImage) URL.revokeObjectURL(attachedImage.previewUrl);
    setAttachedImage(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim() && !attachedImage) return;
    onSend(input, attachedImage?.payload);
    setInput("");
    clearAttachedImage();
  };

  return (
    <aside
      className="relative flex h-full w-full min-w-0 flex-col bg-white/95 backdrop-blur-sm"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Drop overlay */}
      {dragActive && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-2 border-2 border-dashed border-brand-400 bg-brand-50/90 backdrop-blur-sm">
          <Upload className="h-5 w-5 text-brand-600" aria-hidden="true" />
          <span className="text-sm font-medium text-brand-700">Drop photo here</span>
        </div>
      )}

      <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-sm">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-primary">
            Ask MyRoots AI
          </p>
          {treeName ? (
            <p className="mt-0.5 truncate text-xs text-text-secondary">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brand-500 align-middle" />
              Viewing: {treeName}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-text-muted">Ready to help</p>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Hide assistant"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-soft bg-white text-text-muted transition hover:border-warm-300 hover:bg-warm-50 hover:text-text-secondary"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div
        ref={listRef}
        className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        {messages.map((message) => (
          <ChatMessageBubble key={message.id} message={message} />
        ))}
        {isSending && <TypingIndicator />}
      </div>

      <TreeAssistantComposer
        input={input}
        isSending={isSending}
        attachedImage={attachedImage}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        onFileChange={handleFileChange}
        onClearAttachment={clearAttachedImage}
      />
    </aside>
  );
}
