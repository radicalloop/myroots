import { ApiError } from '../../../utils/ApiError';

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isFutureDate(date: string): boolean {
  return date > todayIsoDate();
}

export function assertPersonDatesNotInFuture(
  birthDate?: string | null,
  deathDate?: string | null,
): void {
  if (birthDate && isFutureDate(birthDate)) {
    throw new ApiError(400, 'Birth date cannot be in the future');
  }

  if (deathDate && isFutureDate(deathDate)) {
    throw new ApiError(400, 'Death date cannot be in the future');
  }
}
