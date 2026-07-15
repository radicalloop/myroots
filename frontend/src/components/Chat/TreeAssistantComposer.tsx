import { FormEvent, useEffect, useLayoutEffect, useRef } from "react";
import clsx from "clsx";
import {
  ImagePlus,
  Mic,
  MicOff,
  Pencil,
  Search,
  SendHorizontal,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { focusChatInput } from "@/utils/focusChatInput";
import { useSpeechToText } from "@/hooks/useSpeechToText";

const QUICK_PROMPTS = [
  {
    id: "add",
    label: "Add person",
    icon: UserPlus,
    message: "Help me add a new person to this tree.",
  },
  {
    id: "edit",
    label: "Edit details",
    icon: Pencil,
    message: "Help me edit someone's details in this tree.",
  },
  {
    id: "find",
    label: "Find someone",
    icon: Search,
    message: "Help me find someone in this tree.",
  },
] as const;

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
  onQuickAction: (id: string, message: string) => void;
}

export function TreeAssistantComposer({
  input,
  isSending,
  attachedImage,
  onInputChange,
  onSubmit,
  onFileChange,
  onClearAttachment,
  onQuickAction,
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

  return (
    <div className="min-w-0 space-y-3 border-t border-border-subtle px-4 py-3">
      <div className="flex flex-wrap gap-2">
        {QUICK_PROMPTS.map(({ id, label, icon: Icon, message }) => (
          <button
            key={id}
            type="button"
            disabled={isSending}
            onClick={() => onQuickAction(id, message)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border-soft bg-white px-3 py-1.5 text-xs font-bold text-text-primary transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

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
        onSubmit={onSubmit}
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
          <ImagePlus className="h-4 w-4" />
        </button>
        {speechSupported && (
          <button
            type="button"
            onClick={listening ? stopSpeech : startSpeech}
            disabled={isSending}
            aria-label={listening ? "Stop recording" : "Start voice input"}
            className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border-soft bg-white transition disabled:opacity-50 ${
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
          placeholder="Ask anything..."
          rows={1}
          className="min-h-11 max-h-28 min-w-0 flex-1 resize-none rounded-xl border border-border-soft bg-white px-3.5 py-2.5 text-sm leading-5 outline-none transition scrollbar-none placeholder:text-text-muted focus:border-brand-400 focus:ring-[3px] focus:ring-brand-500/15 [&::-webkit-scrollbar]:hidden"
          disabled={isSending}
        />
        <Button
          type="submit"
          loading={isSending}
          disabled={!input.trim() && !attachedImage}
          className="h-11 w-11 shrink-0 !px-0"
          size="md"
          aria-label="Send message"
        >
          <SendHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}
