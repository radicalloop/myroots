import { Person } from "../../../entities/Person";
import { ApiError } from "../../../utils/ApiError";
import { PersonService } from "../../persons/person.service";
import { ChatMessageDto } from "../dto/chat.dto";
import { resolvePersonByName, AiPersonFields } from "./chat.helper";
import { AiActionItem, ChatActionResult } from "../types/chat.types";

export interface ProfileImageRequest {
  targetName: string;
}

export function splitProfileImageActions(
  actions: AiActionItem[],
): {
  profileImageRequests: ProfileImageRequest[];
  actions: AiActionItem[];
} {
  const profileImageRequests: ProfileImageRequest[] = [];
  const remaining: AiActionItem[] = [];

  for (const item of actions) {
    if (
      item.action === "UPDATE_PERSON" &&
      (item.person as AiPersonFields | null)?.profile_image
    ) {
      const targetName = item.target_name?.trim() ?? "";
      if (targetName) {
        profileImageRequests.push({ targetName });
      }

      const person = item.person as AiPersonFields;
      delete person.profile_image;

      if (Object.keys(person).length === 0) {
        continue;
      }
    }

    remaining.push(item);
  }

  return { profileImageRequests, actions: remaining };
}

export async function applyProfileImageUpdates(
  personService: PersonService,
  persons: Person[],
  treeId: string,
  userId: string,
  chatImage: NonNullable<ChatMessageDto["image"]>,
  requests: ProfileImageRequest[],
): Promise<ChatActionResult[]> {
  const results: ChatActionResult[] = [];

  for (const request of requests) {
    const resolved = resolvePersonByName(persons, request.targetName);

    if (resolved.kind !== "found") {
      results.push({
        action: "UPDATE_PERSON",
        person: null,
        success: false,
        error: `Could not find "${request.targetName}" to set profile image.`,
      });
      continue;
    }

    try {
      const buffer = Buffer.from(chatImage.data, "base64");
      const updated = await personService.uploadPersonImageDirect(
        treeId,
        resolved.person.id,
        userId,
        buffer,
        chatImage.content_type,
      );
      results.push({
        action: "UPDATE_PERSON",
        person: updated,
        success: true,
      });
    } catch (error) {
      results.push({
        action: "UPDATE_PERSON",
        person: null,
        success: false,
        error:
          error instanceof ApiError
            ? error.message
            : "Could not set profile image.",
      });
    }
  }

  return results;
}
