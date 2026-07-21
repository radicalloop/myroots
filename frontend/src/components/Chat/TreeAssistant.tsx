import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import clsx from "clsx";
import { Sparkles, Upload, X } from "lucide-react";
import { ChatMessage, ChatImagePayload } from "@/types/chat.types";
import { fileToChatImagePayload } from "@/utils/chat.utils";
import { ChatMessageBubble, TypingIndicator } from "./ChatMessageBubble";
import { TreeAssistantComposer } from "./TreeAssistantComposer";
import { useImageDrop } from "@/hooks/useImageDrop";
import { DEFAULT_ACTIONS, DEFAULT_QUESTIONS } from "./tree-assistant-defaults";

interface TreeAssistantProps {
  messages: ChatMessage[];
  isSending: boolean;
  onSend: (message: string, image?: ChatImagePayload) => void;
  treeName?: string;
  currentUserName?: string;
  onClose?: () => void;
}

export function TreeAssistant({
  messages,
  isSending,
  onSend,
  treeName,
  currentUserName,
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
  const isDefaultState =
    !isSending &&
    messages.length <= 1 &&
    messages.every((message) => message.role === "assistant");

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

  const fillPrompt = (message: string) => {
    setInput(message);
  };

  const sendPrompt = (message: string) => {
    onSend(message);
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

      <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-sm">
          <Sparkles className="h-[18px] w-[18px]" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold leading-tight text-text-primary">
            MyRoots Assistant
          </p>
          {treeName ? (
            <p className="mt-0.5 truncate text-sm leading-tight text-text-secondary">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-brand-500 align-middle" />
              Viewing: {treeName}
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-text-muted">Ready to help</p>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Hide assistant"
            className="flex h-8 w-8 shrink-0 items-center justify-center text-text-muted transition hover:text-text-secondary"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div
        ref={listRef}
        className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-5"
      >
        {isDefaultState ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <div className="rounded-2xl bg-warm-50 px-4 py-3 text-sm leading-relaxed text-text-primary">
                Hi{currentUserName ? ` ${currentUserName}` : ""}! I can help you explore this tree — ask about people, add
                someone new, or edit details.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {DEFAULT_ACTIONS.map(({ label, icon: Icon, message }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => fillPrompt(message)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border-soft bg-white px-3.5 text-xs font-semibold text-text-primary transition hover:border-brand-200 hover:bg-brand-50/50"
                >
                  <Icon className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>

            <div>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Or try asking
              </p>
              <div className="flex flex-col gap-2">
                {DEFAULT_QUESTIONS.map(
                  ({ label, message, icon: Icon, highlighted }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => sendPrompt(message)}
                      className={clsx(
                        "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium leading-snug transition",
                        highlighted
                          ? "border-brand-200 bg-brand-50 text-text-primary hover:bg-brand-100/70"
                          : "border-border-soft bg-white text-text-primary hover:border-brand-200 hover:bg-brand-50/40",
                      )}
                    >
                      <Icon
                        className={clsx(
                          "h-4 w-4 shrink-0",
                          highlighted ? "text-brand-600" : "text-text-muted",
                        )}
                        aria-hidden="true"
                      />
                      {label}
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}
            {isSending && <TypingIndicator />}
          </>
        )}
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
