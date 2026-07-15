import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTreeView } from '@/hooks/api/useFamilyTree';
import { sendChatMessage, sendPublicChatMessage } from '@/api/family-tree.api';
import { getErrorMessage } from '@/lib/axios';
import { QUERY_KEYS } from '@/constants/app.constants';
import { ChatMessage, ChatImagePayload, ChatAction } from '@/types/chat.types';
import { createChatMessage, getWelcomeMessage, buildChatImageDataUrl, sanitizeAssistantMessage } from '@/utils/chat.utils';
import { announceChatFocusNode } from '@/utils/chat-focus-events';

interface UseChatBotOptions {
  publicMode?: boolean;
  publicTreeName?: string;
}

export function useChatBot(isOpen: boolean, options: UseChatBotOptions = {}) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { publicMode = false, publicTreeName } = options;

  const treeId = useMemo(() => {
    const match = location.pathname.match(/\/tree\/([^/]+)/);
    return match?.[1];
  }, [location.pathname]);

  const { data: treeView } = useTreeView(treeId ?? '', { enabled: !publicMode });

  const treeName = publicMode ? publicTreeName : treeView?.tree.name;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  const getAssistantFocusPersonId = useCallback(
    (
      action: ChatAction,
      data: {
        focusPerson: { id: string } | null;
        person: { id: string } | null;
        results?: Array<{
          action: ChatAction;
          person: { id: string } | null;
          success: boolean;
        }>;
      },
    ): string | null => {
      if (data.focusPerson?.id) {
        return data.focusPerson.id;
      }

      if (data.person?.id) {
        return data.person.id;
      }

      if (action !== 'BATCH' || !data.results?.length) {
        return null;
      }

      for (let i = data.results.length - 1; i >= 0; i -= 1) {
        const result = data.results[i];
        if (
          result.success &&
          (result.action === 'ADD_PERSON' ||
            result.action === 'UPDATE_PERSON' ||
            result.action === 'ADD_PARENT' ||
            result.action === 'ADD_SPOUSE') &&
          result.person?.id
        ) {
          return result.person.id;
        }
      }

      return null;
    },
    [],
  );

  useEffect(() => {
    if (!isOpen) return;
    setMessages([getWelcomeMessage(treeName)]);
  }, [isOpen, treeId, treeName]);

  const sendMessage = useCallback(
    async (content: string, image?: ChatImagePayload) => {
      const trimmed = content.trim();
      if ((!trimmed && !image) || isSending) return;

      if (!treeId) {
        setMessages((prev) => [
          ...prev,
          createChatMessage(
            'assistant',
            'Open a family tree first so I know which one to help with.',
          ),
        ]);
        return;
      }

      const imageUrl = image ? buildChatImageDataUrl(image) : undefined;
      const userMessage = createChatMessage(
        'user',
        trimmed || (imageUrl ? '' : '(sent an image)'),
        imageUrl,
      );

      const previousMessages = messages
        .slice(1) // skip welcome message
        .slice(-30) // keep last 30 messages (~15 turns)
        .map(({ role, content }) => ({ role, content }));

      setMessages((prev) => [...prev, userMessage]);
      setIsSending(true);

      try {
        if (publicMode) {
          const res = await sendPublicChatMessage(treeId, {
            message: trimmed || 'Please look at the attached image.',
            previousMessages,
          });

          const { reply } = res.data.data;
          setMessages((prev) => [...prev, createChatMessage('assistant', sanitizeAssistantMessage(reply))]);
        } else {
          const res = await sendChatMessage(treeId, {
            message: trimmed || 'Please look at the attached image.',
            image,
            previousMessages,
          });

          const { reply, action, person, focus_person, results } = res.data.data;

          let displayReply = sanitizeAssistantMessage(reply);

          if (results && results.length > 0) {
            const failedResults = results.filter((r) => !r.success);
            if (failedResults.length > 0 && !displayReply.includes(failedResults[0].error ?? '')) {
              const errorMessages = failedResults
                .map((r) => r.error)
                .filter(Boolean)
                .join('\n');
              if (errorMessages) {
                displayReply += `\n\n${errorMessages}`;
              }
            }
          }

          setMessages((prev) => [...prev, createChatMessage('assistant', displayReply)]);

          if (
            action === 'ADD_PERSON' ||
            action === 'UPDATE_PERSON' ||
            action === 'ADD_SPOUSE' ||
            action === 'ADD_PARENT' ||
            action === 'BULK_UPDATE_PERSONS' ||
            action === 'BATCH'
          ) {
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.TREE_VIEW(treeId),
            });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PERSONS(treeId) });
          }

          const focusPersonId = getAssistantFocusPersonId(action, {
            focusPerson: focus_person,
            person,
            results,
          });
          if (focusPersonId) {
            announceChatFocusNode(treeId, focusPersonId, { source: 'assistant' });
          }
        }
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        const displayMessage =
          errorMessage === 'Bad Request' || !errorMessage
            ? "Sorry, I couldn't process that request. Could you try rephrasing it?"
            : errorMessage;
        setMessages((prev) => [
          ...prev,
          createChatMessage('assistant', displayMessage),
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [getAssistantFocusPersonId, isSending, treeId, queryClient, messages, publicMode],
  );

  return {
    messages,
    isSending,
    sendMessage,
    treeId,
    treeName,
  };
}
