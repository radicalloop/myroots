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
    target_id:
      typeof obj.target_id === 'string' ? obj.target_id : undefined,
    person:
      obj.person && typeof obj.person === 'object'
        ? (obj.person as AiActionItem['person'])
        : null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasDecisionShape(obj: Record<string, unknown>): boolean {
  return (
    Array.isArray(obj.actions) ||
    ALLOWED_ACTIONS.includes(obj.action as ChatAction) ||
    typeof obj.reply === 'string'
  );
}

function extractReplyText(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function unwrapDecisionObject(
  parsed: unknown,
): Record<string, unknown> | string | null {
  if (typeof parsed === 'string') {
    const nested = extractJsonFromAiResponse(parsed);
    if (nested && nested !== parsed) {
      const unwrapped = unwrapDecisionObject(nested);
      if (unwrapped) return unwrapped;
    }

    return parsed;
  }

  if (!isRecord(parsed)) {
    return null;
  }

  if (hasDecisionShape(parsed)) {
    return parsed;
  }

  for (const key of ['response', 'result', 'data', 'decision', 'output']) {
    const unwrapped = unwrapDecisionObject(parsed[key]);
    if (unwrapped) return unwrapped;
  }

  for (const key of ['answer', 'message', 'content', 'text']) {
    const reply = extractReplyText(parsed[key]);
    if (reply) return reply;
  }

  return null;
}

function buildPlainReplyDecision(raw: string): AiDecisionBatch {
  return {
    actions: [],
    reply: raw.trim(),
    focus_person_name: null,
  };
}

function looksLikeActionJson(raw: string): boolean {
  return /["']actions["']\s*:|["']action["']\s*:\s*["'](?:ADD_PERSON|UPDATE_PERSON|ADD_SPOUSE|ADD_PARENT|BULK_UPDATE_PERSONS)/i.test(raw);
}

function buildUnreadableActionDecision(): AiDecisionBatch {
  return {
    actions: [],
    reply:
      "Sorry, I couldn't read the assistant's action response. Please try that request again.",
    focus_person_name: null,
  };
}

export function parseAiDecision(raw: string): AiDecisionBatch {
  const parsed = extractJsonFromAiResponse(raw);
  const decisionInput = unwrapDecisionObject(parsed);

  if (!decisionInput) {
    // Check if the raw output contains destructive action language
    const destructiveAction = detectDestructiveInRaw(raw);
    if (destructiveAction) {
      return {
        actions: [],
        reply: DELETE_REFUSAL_REPLY,
        focus_person_name: null,
      };
    }

    if (looksLikeActionJson(raw)) {
      return buildUnreadableActionDecision();
    }

    if (raw.trim()) {
      return buildPlainReplyDecision(raw);
    }

    return {
      actions: [],
      reply:
        "Sorry, I couldn't understand the assistant's response. Please try again.",
      focus_person_name: null,
    };
  }

  if (typeof decisionInput === 'string') {
    if (detectDestructiveInRaw(decisionInput)) {
      return { actions: [], reply: DELETE_REFUSAL_REPLY, focus_person_name: null };
    }

    if (looksLikeActionJson(decisionInput)) {
      return buildUnreadableActionDecision();
    }

    return buildPlainReplyDecision(decisionInput);
  }

  const obj = decisionInput;

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
