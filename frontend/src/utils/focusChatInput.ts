import { RefObject } from "react";

function isModalOpen(): boolean {
  if (typeof document === "undefined") return false;
  return (
    document.querySelector('[role="dialog"], [aria-modal="true"]') !== null
  );
}

function isOtherEditableFocused(
  inputEl: HTMLInputElement | HTMLTextAreaElement,
): boolean {
  const active = document.activeElement;
  if (!active || active === inputEl) return false;

  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    return true;
  }

  if (active instanceof HTMLElement && active.isContentEditable) {
    return true;
  }

  return false;
}

export function focusChatInput(
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
): void {
  const el = inputRef.current;
  if (!el || el.disabled) return;
  if (isModalOpen()) return;
  if (isOtherEditableFocused(el)) return;

  const selectionStart = el.selectionStart;
  const selectionEnd = el.selectionEnd;

  el.focus({ preventScroll: true });

  if (
    el.value.length > 0 &&
    selectionStart !== null &&
    selectionEnd !== null
  ) {
    el.setSelectionRange(selectionStart, selectionEnd);
  }
}
