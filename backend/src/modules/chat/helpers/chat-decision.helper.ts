import { extractJsonFromAiResponse } from './chat.helper';
import {
  AiActionItem,
  AiDecisionBatch,
  ChatAction,
} from '../types/chat.types';

const ALLOWED_ACTIONS: ChatAction[] = [
  'NONE',
  'ADD_PERSON',
  'UPDATE_PERSON',
  'ADD_SPOUSE',
  'ADD_PARENT',
  'BULK_UPDATE_PERSONS',
];

/** Destructive action names that indicate the AI tried to delete/remove something. */
const DESTRUCTIVE_ACTIONS = new Set([
  'DELETE_PERSON',
  'DELETE_TREE',
  'REMOVE_PERSON',
  'REMOVE_TREE',
  'CLEAR_TREE',
  'DELETE',
  'REMOVE',
  'CLEAR',
  'DESTROY',
  'ERASE',
]);

const DELETE_REFUSAL_REPLY =
  'I can help you add people, edit their details, and answer questions about the family tree, but deleting or removing people is not supported through the AI assistant. Please use the tree interface to delete the person manually.';

function isDestructiveAction(action: unknown): boolean {
  return typeof action === 'string' && DESTRUCTIVE_ACTIONS.has(action);
}

function normalizeActionItem(value: unknown): AiActionItem {
  if (!value || typeof value !== 'object') {
    return { action: 'NONE', target_name: null, person: null };
  }

  const obj = value as Record<string, unknown>;
  const action = ALLOWED_ACTIONS.includes(obj.action as ChatAction)
    ? (obj.action as ChatAction)
    : 'NONE';

  return {
    action,
    target_name:
      typeof obj.target_name === 'string' ? obj.target_name : null,
    person:
      obj.person && typeof obj.person === 'object'
        ? (obj.person as AiActionItem['person'])
        : null,
  };
}

export function parseAiDecision(raw: string): AiDecisionBatch {
  const parsed = extractJsonFromAiResponse(raw);

  if (!parsed || parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    // Check if the raw output contains destructive action language
    const destructiveAction = detectDestructiveInRaw(raw);
    if (destructiveAction) {
      return {
        actions: [],
        reply: DELETE_REFUSAL_REPLY,
        focus_person_name: null,
      };
    }

    return {
      actions: [],
      reply:
        "Sorry, I couldn't understand the assistant's response. Please try again.",
      focus_person_name: null,
    };
  }

  const obj = parsed as Record<string, unknown>;

  // Check for destructive action before normal shape validation
  if (Array.isArray(obj.actions)) {
    const hasDestructive = (obj.actions as unknown[]).some((item) => {
      if (item && typeof item === 'object' && 'action' in (item as Record<string, unknown>)) {
        return isDestructiveAction((item as Record<string, unknown>).action);
      }
      return false;
    });
    if (hasDestructive) {
      return { actions: [], reply: DELETE_REFUSAL_REPLY, focus_person_name: null };
    }
  }

  if (isDestructiveAction(obj.action)) {
    return { actions: [], reply: DELETE_REFUSAL_REPLY, focus_person_name: null };
  }

  const hasExpectedShape =
    Array.isArray(obj.actions) ||
    ALLOWED_ACTIONS.includes(obj.action as ChatAction) ||
    typeof obj.reply === 'string';

  if (!hasExpectedShape) {
    return {
      actions: [],
      reply:
        "Sorry, I couldn't understand the assistant's response. Please try rephrasing your request.",
      focus_person_name: null,
    };
  }

  const reply =
    typeof obj.reply === 'string' && obj.reply.trim()
      ? obj.reply.trim()
      : 'Okay.';
  const focusPersonName =
    typeof obj.focus_person_name === 'string' && obj.focus_person_name.trim()
      ? obj.focus_person_name.trim()
      : null;

  if (Array.isArray(obj.actions)) {
    const actions = obj.actions
      .map(normalizeActionItem)
      .filter((item) => item.action !== 'NONE');

    return { actions, reply, focus_person_name: focusPersonName };
  }

  const single = normalizeActionItem(obj);
  if (single.action === 'NONE') {
    return { actions: [], reply, focus_person_name: focusPersonName };
  }

  return { actions: [single], reply, focus_person_name: focusPersonName };
}

/** Check raw AI output text for destructive action names (before JSON parsing). */
function detectDestructiveInRaw(raw: string): string | null {
  const lower = raw.toLowerCase();
  for (const action of DESTRUCTIVE_ACTIONS) {
    if (lower.includes(action.toLowerCase())) {
      return action;
    }
  }
  return null;
}
