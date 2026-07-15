import dayjs from "dayjs";
import { PersonFormValues } from "@/validations/family-tree.validation";
import {
  CreatePersonPayload,
  AddParentPayload,
  Gender,
  TreePersonNode,
  UpdatePersonPayload,
} from "@/types/api.types";

export function todayInputDate(): string {
  return dayjs().format("YYYY-MM-DD");
}

export function isFutureDate(date: string): boolean {
  const trimmed = date.trim();
  if (!trimmed) return false;
  return dayjs(trimmed).isAfter(dayjs(), "day");
}

export function getFutureDateError(
  field: "birth_date" | "death_date",
): string {
  return field === "birth_date"
    ? "Birth date cannot be in the future"
    : "Death date cannot be in the future";
}

export function formatYearRange(
  birthDate: string | null,
  deathDate: string | null,
): string {
  const birth = birthDate ? dayjs(birthDate).format("YYYY") : "";
  const death = deathDate ? dayjs(deathDate).format("YYYY") : "";
  return death ? `${birth} – ${death}` : birth;
}

export function getPersonLabel(person: TreePersonNode): string {
  return `${person.first_name} ${person.last_name}`;
}

export function toPersonPayload(values: PersonFormValues): CreatePersonPayload {
  return {
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    gender: values.gender ?? Gender.MALE,
    birth_date: values.birth_date?.trim() || null,
    death_date: values.death_date?.trim() || null,
    birth_place: values.birth_place?.trim() || null,
    current_place: values.current_place?.trim() || null,
    health_note: values.health_note?.trim() || null,
    is_root: false,
    parent_id: null,
  };
}

export function toAddParentPayload(values: PersonFormValues): AddParentPayload {
  const payload = toPersonPayload(values);
  return {
    first_name: payload.first_name,
    last_name: payload.last_name,
    gender: payload.gender,
    birth_date: payload.birth_date,
    death_date: payload.death_date,
    birth_place: payload.birth_place,
    current_place: payload.current_place,
    health_note: payload.health_note,
  };
}

export function toUpdatePersonPayload(
  values: PersonFormValues,
): UpdatePersonPayload {
  return {
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    gender: values.gender,
    birth_date: values.birth_date?.trim() || null,
    death_date: values.death_date?.trim() || null,
    birth_place: values.birth_place?.trim() || null,
    current_place: values.current_place?.trim() || null,
    health_note: values.health_note?.trim() || null,
  };
}
