import { ChevronLeft, Sparkles } from "lucide-react";
import { TreeAssistant } from "@/components/Chat/TreeAssistant";
import { ChatMessage, ChatImagePayload } from "@/types/chat.types";

interface TreeAssistantPaneProps {
  open: boolean;
  messages: ChatMessage[];
  isSending: boolean;
  treeName: string;
  currentUserName?: string;
  onSend: (message: string, image?: ChatImagePayload) => void;
  onOpen: () => void;
  onClose: () => void;
}

export function TreeAssistantPane({
  open,
  messages,
  isSending,
  treeName,
  currentUserName,
  onSend,
  onOpen,
  onClose,
}: TreeAssistantPaneProps) {
  return (
    <>
      {/* Desktop: expanded panel or collapsed rail */}
      <div
        className={`relative hidden h-full shrink-0 overflow-hidden border-l border-border-subtle bg-white transition-[width] duration-300 ease-out lg:block ${
          open ? "w-[380px]" : "w-14"
        }`}
      >
        {open ? (
          <div className="h-full w-[380px]">
            <TreeAssistant
              messages={messages}
              isSending={isSending}
              onSend={onSend}
              treeName={treeName}
              currentUserName={currentUserName}
              onClose={onClose}
            />
          </div>
        ) : (
          <div className="flex h-full w-14 flex-col items-center py-3">
            <button
              type="button"
              onClick={onOpen}
              aria-label="Open assistant"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-sm transition hover:from-brand-600 hover:to-brand-700"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
            </button>

            <button
              type="button"
              onClick={onOpen}
              className="mt-6 flex flex-1 items-center justify-center"
              aria-label="Open MyRoots Assistant"
            >
              <span className="rotate-90 whitespace-nowrap text-[11px] font-semibold tracking-[0.18em] text-text-muted">
                ASK MYROOTS AI
              </span>
            </button>

            <button
              type="button"
              onClick={onOpen}
              aria-label="Expand assistant"
              className="mb-1 flex h-8 w-8 items-center justify-center rounded-lg border border-border-soft bg-white text-text-muted transition hover:border-warm-300 hover:bg-warm-50 hover:text-text-secondary"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {/* Mobile: bottom sheet when open */}
      {open && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/30 lg:hidden">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close assistant"
            onClick={onClose}
          />
          <div className="relative h-[90dvh] overflow-hidden rounded-t-3xl bg-white shadow-2xl">
            <TreeAssistant
              messages={messages}
              isSending={isSending}
              onSend={onSend}
              treeName={treeName}
              currentUserName={currentUserName}
              onClose={onClose}
            />
          </div>
        </div>
      )}

      {/* Mobile: floating open control when closed */}
      {!open && (
        <button
          type="button"
          onClick={onOpen}
          className="fixed bottom-6 right-6 z-30 inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-b from-brand-500 to-brand-600 px-4 text-sm font-semibold text-white shadow-lg transition hover:scale-105 lg:hidden"
          aria-label="Ask MyRoots AI"
        >
          <Sparkles className="h-5 w-5" />
          Ask MyRoots AI
        </button>
      )}
    </>
  );
}
