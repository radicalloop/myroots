export const CHAT_FOCUS_NODE_EVENT = 'chat:focus-tree-node';

export interface ChatFocusNodeEventDetail {
  treeId: string;
  personId: string;
  force?: boolean;
  source?: 'assistant' | 'search';
}

export function announceChatFocusNode(
  treeId: string,
  personId: string,
  options?: { force?: boolean; source?: ChatFocusNodeEventDetail['source'] },
): void {
  window.dispatchEvent(
    new CustomEvent<ChatFocusNodeEventDetail>(CHAT_FOCUS_NODE_EVENT, {
      detail: {
        treeId,
        personId,
        force: options?.force,
        source: options?.source,
      },
    }),
  );
}
