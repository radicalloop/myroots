import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Search, Sparkles, Upload, X } from "lucide-react";
import { ChatMessage, ChatImagePayload } from "@/types/chat.types";
import { fileToChatImagePayload } from "@/utils/chat.utils";
import { ChatMessageBubble, TypingIndicator } from "./ChatMessageBubble";
import { TreeAssistantComposer } from "./TreeAssistantComposer";
import { useImageDrop } from "@/hooks/useImageDrop";

const DEFAULT_ACTIONS = [
  {
    label: "Add person",
    icon: Plus,
    message:
      "Add a person:\nFirst name: \nLast name: \nGender: \nWhere to add: \nRelationship: child / parent / spouse",
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
    message: "Find someone:\nName or clue: ",
  },
] as const;

const DEFAULT_QUESTIONS = [
  {
    label: "Who are my oldest known ancestors?",
    message: "Who are my oldest known ancestors?",
  },
  {
    label: "Tell me about my family history",
    message: "Tell me about my family history",
  },
  {
    label: "Help me find missing details",
    message: "Help me find missing family details",
  },
] as const;

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

      <div className="flex items-center gap-3 border-b border-border-subtle px-5 py-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-sm">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-bold leading-tight text-text-primary">
            MyRoots Assistant
          </p>
          {treeName ? (
            <p className="mt-0.5 truncate text-base leading-tight text-text-secondary">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-brand-500 align-middle" />
              Viewing: {treeName}
            </p>
          ) : (
            <p className="mt-0.5 text-base text-text-muted">Ready to help</p>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Hide assistant"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warm-50 text-text-muted transition hover:bg-warm-100 hover:text-text-secondary"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div
        ref={listRef}
        className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-6"
      >
        {isDefaultState ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="rounded-[22px] bg-warm-50 px-5 py-4 text-[17px] font-medium leading-relaxed text-text-primary">
                Hi! I can help you explore this tree — ask about people, add
                someone new, or edit details.
              </div>
            </div>

            <div className="ml-14 flex flex-wrap gap-2.5">
              {DEFAULT_ACTIONS.map(({ label, icon: Icon, message }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => fillPrompt(message)}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-border-soft bg-white px-4 text-sm font-bold text-text-primary shadow-sm transition hover:border-brand-300 hover:bg-brand-50"
                >
                  <Icon className="h-4 w-4 text-brand-600" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>

            <div className="ml-14">
              <p className="mb-3 text-sm font-bold uppercase tracking-wide text-text-muted">
                Or try asking
              </p>
              <div className="flex flex-col gap-3">
                {DEFAULT_QUESTIONS.map(({ label, message }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => sendPrompt(message)}
                    className="rounded-[22px] border border-border-soft bg-white px-5 py-3 text-left text-lg font-medium leading-snug text-text-primary shadow-sm transition hover:border-brand-300 hover:bg-brand-50"
                  >
                    {label}
                  </button>
                ))}
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
