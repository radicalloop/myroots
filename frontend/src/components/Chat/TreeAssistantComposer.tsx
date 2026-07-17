import { FormEvent, useEffect, useLayoutEffect, useRef } from "react";
import clsx from "clsx";
import { Mic, MicOff, Plus, SendHorizontal, X } from "lucide-react";
import { focusChatInput } from "@/utils/focusChatInput";
import { useSpeechToText } from "@/hooks/useSpeechToText";

const TEXTAREA_MAX_HEIGHT = 112;

function syncTextareaHeight(textarea: HTMLTextAreaElement): void {
  textarea.style.height = "auto";
  const nextHeight = Math.min(textarea.scrollHeight, TEXTAREA_MAX_HEIGHT);
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY =
    textarea.scrollHeight > TEXTAREA_MAX_HEIGHT ? "auto" : "hidden";
}

interface AttachedImagePreview {
  previewUrl: string;
  name: string;
}

interface TreeAssistantComposerProps {
  input: string;
  isSending: boolean;
  attachedImage: AttachedImagePreview | null;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearAttachment: () => void;
}

export function TreeAssistantComposer({
  input,
  isSending,
  attachedImage,
  onInputChange,
  onSubmit,
  onFileChange,
  onClearAttachment,
}: TreeAssistantComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wasSendingRef = useRef(isSending);
  const pendingCursorRef = useRef<number | null>(null);

  const {
    listening,
    supported: speechSupported,
    start: startSpeech,
    stop: stopSpeech,
  } = useSpeechToText({ value: input, onChange: onInputChange });

  useLayoutEffect(() => {
    if (!inputRef.current) return;

    const textarea = inputRef.current;
    syncTextareaHeight(textarea);

    const cursorPosition = pendingCursorRef.current;
    if (cursorPosition === null) return;

    pendingCursorRef.current = null;
    textarea.focus();
    textarea.setSelectionRange(cursorPosition, cursorPosition);
  }, [input]);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      focusChatInput(inputRef);
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (wasSendingRef.current && !isSending) {
      const frameId = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          focusChatInput(inputRef);
        });
      });
      wasSendingRef.current = isSending;
      return () => cancelAnimationFrame(frameId);
    }
    wasSendingRef.current = isSending;
  }, [isSending]);

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (listening) {
      stopSpeech();
    }

    onSubmit(event);
    requestAnimationFrame(() => {
      focusChatInput(inputRef);
    });
  };

  return (
    <div className="min-w-0 space-y-3 border-t border-border-subtle bg-white px-4 pb-4 pt-3">
      {attachedImage && (
        <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-warm-50 px-2.5 py-2">
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
            onClick={onClearAttachment}
            className="rounded-lg p-1 text-text-muted transition-colors hover:bg-warm-200 hover:text-text-secondary"
            aria-label="Remove attached image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <form
        onSubmit={handleFormSubmit}
        className={clsx(
          "flex w-full min-w-0 gap-2",
          input.includes("\n") ? "items-end" : "items-center",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={onFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
          aria-label="Attach an image"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border-soft bg-white text-text-muted transition hover:border-warm-300 hover:text-text-secondary disabled:opacity-50"
        >
          <Plus className="h-5 w-5" />
        </button>
        <div className="relative flex min-h-11 min-w-0 flex-1 items-center rounded-xl border border-border-soft bg-white transition focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-500/10">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;

              const textarea = event.currentTarget;

              if (!event.shiftKey) {
                event.preventDefault();
                textarea.form?.requestSubmit();
                return;
              }

              event.preventDefault();
              const { selectionStart, selectionEnd, value } = textarea;
              const start = selectionStart ?? value.length;
              const end = selectionEnd ?? value.length;
              const nextValue = `${value.slice(0, start)}\n${value.slice(end)}`;

              pendingCursorRef.current = start + 1;
              onInputChange(nextValue);
            }}
            placeholder="Ask about your family..."
            rows={1}
            className="max-h-28 min-h-9 min-w-0 flex-1 resize-none rounded-xl border-0 bg-transparent py-2 pl-4 pr-10 text-sm leading-5 text-text-primary outline-none scrollbar-none placeholder:text-text-muted [&::-webkit-scrollbar]:hidden"
          />
          {speechSupported && (
            <button
              type="button"
              onClick={listening ? stopSpeech : startSpeech}
              disabled={isSending}
              aria-label={listening ? "Stop recording" : "Start voice input"}
              className={`absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition disabled:opacity-50 ${
                listening
                  ? "text-brand-500 hover:bg-brand-500/10 hover:text-brand-600 bg-brand-500/10"
                  : "text-text-muted hover:bg-warm-50 hover:text-text-secondary"
              }`}
            >
              {listening ? (
                <>
                  <Mic className="pointer-events-none h-4 w-4" />
                  <span className="pointer-events-none absolute right-0 top-0 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
                  </span>
                </>
              ) : (
                <Mic className="pointer-events-none h-4 w-4" />
              )}
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={isSending || (!input.trim() && !attachedImage)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white transition hover:bg-brand-600 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
          aria-label="Send message"
        >
          <SendHorizontal className="h-5 w-5" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
