import { FormEvent, useEffect, useLayoutEffect, useRef } from "react";
import clsx from "clsx";
import {
  ImagePlus,
  Mic,
  MicOff,
  Pencil,
  Search,
  SendHorizontal,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { focusChatInput } from "@/utils/focusChatInput";
import { useSpeechToText } from "@/hooks/useSpeechToText";

const QUICK_PROMPTS = [
  {
    label: "Tell me about my family history",
    message: "Tell me about my family history",
  },
  {
    label: "Who are my oldest known ancestors?",
    message: "Who are my oldest known ancestors?",
  },
  {
    label: "Help me find missing family details",
    message: "Help me find missing family details",
  },
  {
    label: "Summarize my family tree",
    message: "Summarize my family tree",
  },
] as const;

const ACTION_TEMPLATES = [
  {
    label: "Add person",
    icon: UserPlus,
    message:
      "Add a person:\nFirst name: \nLast name: \nGender: \nWhere to add: under [person name] / as root\nRelationship: child / parent / spouse\nBirth date/place (optional): ",
  },
  {
    label: "Edit details",
    icon: Pencil,
    message:
      "Edit details:\nPerson to edit: \nWhat detail should change: \nNew value: ",
  },
  {
    label: "Find someone",
    icon: Search,
    message:
      "Find someone:\nName or clue: \nWhat should I look for: ",
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

  const fillPrompt = (message: string) => {
    onInputChange(message);
    requestAnimationFrame(() => {
      focusChatInput(inputRef);
      const nextCursor = message.length;
      inputRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    onSubmit(event);
    requestAnimationFrame(() => {
      focusChatInput(inputRef);
    });
  };

  return (
    <div className="min-w-0 space-y-3 border-t border-border-subtle px-4 py-3">
      <div className="rounded-2xl border border-brand-100 bg-brand-50/70 px-3 py-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold text-text-primary">
            Ask MyRoots AI
          </p>
        </div>
        <div className="mb-2 flex flex-wrap gap-2">
          {ACTION_TEMPLATES.map(({ label, icon: Icon, message }) => (
            <button
              key={label}
              type="button"
              disabled={isSending}
              onClick={() => fillPrompt(message)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border-soft bg-white px-3 py-1.5 text-xs font-bold text-text-primary transition hover:border-brand-300 hover:bg-white disabled:opacity-50"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map(({ label, message }) => (
            <button
              key={label}
              type="button"
              disabled={isSending}
              onClick={() => fillPrompt(message)}
              className="inline-flex items-center rounded-full border border-brand-100 bg-white px-3 py-1.5 text-left text-xs font-semibold text-brand-800 transition hover:border-brand-300 hover:bg-brand-100 disabled:opacity-50"
            >
              {label}
            </button>
          ))}
        </div>
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
