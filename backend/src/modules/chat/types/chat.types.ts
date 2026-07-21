import { PersonResponse } from '../../persons/helpers/person.mapper';
import { AiPersonFields } from '../helpers/chat.helper';

export type ChatAction = 'NONE' | 'ADD_PERSON' | 'UPDATE_PERSON' | 'ADD_SPOUSE' | 'ADD_PARENT' | 'BULK_UPDATE_PERSONS' | 'BATCH';

export interface AiActionItem {
  action: ChatAction;
  target_name: string | null;
  target_id?: string;
  person: AiPersonFields | null;
}

export interface AiDecisionBatch {
  actions: AiActionItem[];
  reply: string;
  focus_person_name: string | null;
}

export interface ChatActionResult {
  action: ChatAction;
  person: PersonResponse | null;
  success: boolean;
  error?: string;
  /** Number of records affected (for bulk actions). */
  updatedCount?: number;
}

export interface ChatResult {
  reply: string;
  action: ChatAction;
  person: PersonResponse | null;
  focus_person: PersonResponse | null;
  results: ChatActionResult[];
}
