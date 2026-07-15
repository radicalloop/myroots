import { useState } from "react";
import { useLocation } from "react-router-dom";
import { ChatIcon } from "./ChatIcon";
import { ChatPanel } from "./ChatPanel";
import { useChatBot } from "@/hooks/useChatBot";

export function ChatWidget() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { messages, isSending, sendMessage, treeName } = useChatBot(isOpen);

  const isTreeRoute = location.pathname.startsWith("/tree/");
  if (isTreeRoute) return null;

  const toggleChat = () => setIsOpen((open) => !open);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <ChatIcon onClick={toggleChat} isOpen={isOpen} />

      <ChatPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        messages={messages}
        isSending={isSending}
        onSend={sendMessage}
        treeName={treeName}
      />
    </div>
  );
}
