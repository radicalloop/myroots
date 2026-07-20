import clsx from "clsx";
import { Check, Pencil, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { treeSchema } from "@/validations/family-tree.validation";

interface TreeDescriptionEditorProps {
  description: string | null;
  onSave: (description: string) => void;
  isSaving?: boolean;
  canEdit?: boolean;
}

const EMPTY_LABEL = "Add a description...";

function normalizeDescription(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function TreeDescriptionEditor({
  description,
  onSave,
  isSaving = false,
  canEdit = true,
}: TreeDescriptionEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submittedSaveRef = useRef(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(normalizeDescription(description));
  const [error, setError] = useState<string | null>(null);
  const savedDescription = normalizeDescription(description);

  useEffect(() => {
    if (!isEditing) {
      setDraft(savedDescription);
      setError(null);
    }
  }, [savedDescription, isEditing]);

  useEffect(() => {
    if (!submittedSaveRef.current || isSaving) return;

    submittedSaveRef.current = false;
    if (draft.trim() === savedDescription) {
      setIsEditing(false);
      setError(null);
    }
  }, [draft, isSaving, savedDescription]);

  useEffect(() => {
    if (!isEditing) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 28)}px`;
  }, [isEditing]);

  const startEditing = () => {
    setDraft(savedDescription);
    setError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    submittedSaveRef.current = false;
    setDraft(savedDescription);
    setError(null);
    setIsEditing(false);
  };

  const saveEditing = () => {
    const trimmed = draft.trim();
    const parsed = treeSchema.shape.description.safeParse(
      trimmed.length > 0 ? trimmed : undefined,
    );

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid description");
      return;
    }

    if (trimmed === savedDescription) {
      setIsEditing(false);
      setError(null);
      return;
    }

    submittedSaveRef.current = true;
    onSave(trimmed);
  };

  if (!canEdit) {
    if (!savedDescription) return null;

    return (
      <p
        className="mt-0.5 max-w-md truncate text-xs leading-snug text-text-secondary"
        title={savedDescription}
      >
        {savedDescription}
      </p>
    );
  }

  if (isEditing) {
    return (
      <div className="mt-0.5 max-w-md">
        <div className="flex min-w-0 items-center gap-1.5">
          <textarea
            ref={textareaRef}
            value={draft}
            disabled={isSaving}
            maxLength={2000}
            rows={1}
            aria-label="Tree description"
            placeholder={EMPTY_LABEL}
            onChange={(event) => {
              setDraft(event.target.value);
              event.target.style.height = "auto";
              event.target.style.height = `${Math.max(event.target.scrollHeight, 28)}px`;
              if (error) setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                saveEditing();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                cancelEditing();
              }
            }}
            className={clsx(
              "min-h-7 min-w-0 flex-1 resize-none rounded-lg border bg-white px-2.5 py-1 text-xs leading-snug text-text-primary outline-none transition",
              "placeholder:text-text-muted focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 disabled:opacity-60",
              error
                ? "border-red-300 focus:border-red-400 focus:ring-red-500/10"
                : "border-border-soft",
            )}
          />
          <button
            type="button"
            onClick={saveEditing}
            disabled={isSaving}
            aria-label="Save tree description"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brand-200 bg-brand-50 text-brand-700 transition hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20 disabled:opacity-60"
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={cancelEditing}
            disabled={isSaving}
            aria-label="Cancel editing tree description"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border-soft bg-white text-text-muted transition hover:bg-warm-50 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/15 disabled:opacity-60"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
        {error && (
          <p className="mt-1 text-[11px] text-red-500" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-0.5 flex min-w-0 max-w-md items-center gap-1">
      <p
        className={clsx(
          "min-w-0 truncate text-xs leading-snug",
          savedDescription ? "text-text-secondary" : "italic text-text-muted",
        )}
        title={savedDescription || undefined}
      >
        {savedDescription || EMPTY_LABEL}
      </p>
      <button
        type="button"
        onClick={startEditing}
        aria-label="Edit tree description"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-text-muted transition hover:bg-warm-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/15"
      >
        <Pencil className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}
