import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Sparkles, X, ImagePlus, Mic, MicOff, Upload } from "lucide-react";
import { ChatMessage, ChatImagePayload } from "@/types/chat.types";
import { fileToChatImagePayload } from "@/utils/chat.utils";
import { ChatMessageBubble, TypingIndicator } from "./ChatMessageBubble";
import { Button } from "@/components/ui/Button";
import { useImageDrop } from "@/hooks/useImageDrop";
import { useSpeechToText } from "@/hooks/useSpeechToText";

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  isSending: boolean;
  onSend: (message: string, image?: ChatImagePayload) => void;
  treeName?: string;
}

export function ChatPanel({
  isOpen,
  onClose,
  messages,
  isSending,
  onSend,
  treeName,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [attachedImage, setAttachedImage] = useState<{
    payload: ChatImagePayload;
    previewUrl: string;
    name: string;
  } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const {
    listening,
    supported: speechSupported,
    start: startSpeech,
    stop: stopSpeech,
  } = useSpeechToText({ value: input, onChange: setInput });

  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, isOpen, isSending]);

  useEffect(() => {
    return () => {
      if (attachedImage) URL.revokeObjectURL(attachedImage.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    processFile(file);
  };

  const clearAttachedImage = () => {
    if (attachedImage) URL.revokeObjectURL(attachedImage.previewUrl);
    setAttachedImage(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim() && !attachedImage) return;

    if (listening) {
      stopSpeech();
    }

    onSend(input, attachedImage?.payload);
    setInput("");
    clearAttachedImage();
  };

  const handleClose = () => {
    if (listening) {
      stopSpeech();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="absolute bottom-16 right-0 flex w-[min(100vw-2rem,400px)] animate-scale-in flex-col overflow-hidden rounded-[var(--radius-card)] border border-border-soft bg-white shadow-[var(--shadow-modal)]"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Drop overlay */}
      {dragActive && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed border-brand-400 bg-brand-50/90 backdrop-blur-sm">
          <Upload className="h-5 w-5 text-brand-600" aria-hidden="true" />
          <span className="text-sm font-medium text-brand-700">
            Drop photo here
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-3.5 text-white">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold">MyRoots Assistant</p>
            {treeName && (
              <p className="text-xs text-brand-100">Viewing: {treeName}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close chat"
          className="rounded-xl p-1.5 transition-colors hover:bg-white/15"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="custom-scrollbar flex max-h-80 flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <Sparkles className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-text-primary">
              How can I help?
            </p>
            <p className="mt-1 max-w-[240px] text-xs text-text-secondary">
              Ask about your family tree, add members, or upload a photo to
              import data.
            </p>
          </div>
        )}
        {messages.map((message) => (
          <ChatMessageBubble key={message.id} message={message} />
        ))}
        {isSending && <TypingIndicator />}
      </div>

      {/* Attachment preview */}
      {attachedImage && (
        <div className="flex items-center gap-2 border-t border-border-subtle bg-warm-50 px-3 py-2.5">
          <img
            src={attachedImage.previewUrl}
            alt="Attachment preview"
            className="h-10 w-10 rounded-lg border border-border-soft object-cover"
          />
          <span className="flex-1 truncate text-xs text-text-secondary">
            {attachedImage.name}
          </span>
          <button
            type="button"
            onClick={clearAttachedImage}
            className="rounded-lg p-1 text-text-muted transition-colors hover:bg-warm-200 hover:text-text-secondary"
            aria-label="Remove attached image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t border-border-subtle bg-warm-50/50 p-3"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
          aria-label="Attach an image"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[var(--radius-input)] border border-border-soft bg-white text-text-muted shadow-sm transition-all duration-150 hover:border-warm-300 hover:text-text-secondary disabled:opacity-50"
        >
          <ImagePlus className="h-4 w-4" />
        </button>
        {speechSupported && (
          <button
            type="button"
            onClick={listening ? stopSpeech : startSpeech}
            disabled={isSending}
            aria-label={listening ? "Stop recording" : "Start voice input"}
            className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[var(--radius-input)] border border-border-soft bg-white shadow-sm transition-all duration-150 disabled:opacity-50 ${
              listening
                ? "border-red-300 text-red-500 hover:border-red-400 hover:text-red-600"
                : "text-text-muted hover:border-warm-300 hover:text-text-secondary"
            }`}
          >
            {listening ? (
              <>
                <MicOff className="pointer-events-none h-4 w-4" />
                <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                </span>
              </>
            ) : (
              <Mic className="pointer-events-none h-4 w-4" />
            )}
          </button>
        )}
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Ask anything..."
          rows={1}
          className="max-h-32 min-h-10 flex-1 resize-none overflow-y-auto rounded-[var(--radius-input)] border border-border-soft bg-white px-3.5 py-2.5 text-sm outline-none transition-all duration-200 [scrollbar-width:none] [-ms-overflow-style:none] placeholder:text-text-muted focus:border-brand-400 focus:ring-[3px] focus:ring-brand-500/15 [&::-webkit-scrollbar]:hidden resize-none"
          disabled={isSending}
        />
        <Button
          type="submit"
          loading={isSending}
          disabled={!input.trim() && !attachedImage}
          className="self-end"
          size="md"
        >
          Send
        </Button>
      </form>
    </div>
  );
}
