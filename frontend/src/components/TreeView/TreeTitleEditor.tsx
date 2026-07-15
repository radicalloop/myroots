import clsx from "clsx";
import { Check, Pencil, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { treeSchema } from "@/validations/family-tree.validation";

interface TreeTitleEditorProps {
  treeName: string;
  onSave: (name: string) => void;
  isSaving?: boolean;
}

export function TreeTitleEditor({
  treeName,
  onSave,
  isSaving = false,
}: TreeTitleEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const submittedSaveRef = useRef(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(treeName);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(treeName);
      setError(null);
    }
  }, [treeName, isEditing]);

  useEffect(() => {
    if (!submittedSaveRef.current || isSaving) return;

    submittedSaveRef.current = false;
    if (draft.trim() === treeName) {
      setIsEditing(false);
      setError(null);
    }
  }, [draft, isSaving, treeName]);

  useEffect(() => {
    if (!isEditing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isEditing]);

  const startEditing = () => {
    setDraft(treeName);
    setError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    submittedSaveRef.current = false;
    setDraft(treeName);
    setError(null);
    setIsEditing(false);
  };

  const saveEditing = () => {
    const trimmed = draft.trim();
    const parsed = treeSchema.shape.name.safeParse(trimmed);

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid name");
      return;
    }

    if (trimmed === treeName) {
      setIsEditing(false);
      setError(null);
      return;
    }

    submittedSaveRef.current = true;
    onSave(trimmed);
  };

  if (isEditing) {
    return (
      <div className="mt-1 sm:mt-1.5">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <input
            ref={inputRef}
            value={draft}
            disabled={isSaving}
            maxLength={255}
            aria-label="Tree name"
            onChange={(event) => {
              setDraft(event.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                saveEditing();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                cancelEditing();
              }
            }}
            className={clsx(
              "min-w-0 flex-1 rounded-xl border bg-white px-3 py-1.5 font-serif text-xl font-normal tracking-tight text-text-primary outline-none transition",
              "focus:border-brand-400 focus:ring-[3px] focus:ring-brand-500/15 disabled:opacity-60",
              "sm:max-w-md sm:text-[30px] sm:leading-none",
              error
                ? "border-red-300 focus:border-red-400 focus:ring-red-500/15"
                : "border-brand-200",
            )}
          />
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={saveEditing}
              disabled={isSaving}
              aria-label="Save tree name"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-200 bg-brand-50 text-brand-700 transition hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25 disabled:opacity-60 sm:h-10 sm:w-10"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={cancelEditing}
              disabled={isSaving}
              aria-label="Cancel editing tree name"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border-soft bg-white text-text-secondary transition hover:bg-warm-50 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20 disabled:opacity-60 sm:h-10 sm:w-10"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-red-500" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-1 flex min-w-0 max-w-full items-center gap-2 sm:mt-1.5">
      <h1 className="min-w-0 truncate font-serif text-xl font-normal tracking-tight text-text-primary sm:text-3xl sm:leading-none">
        {treeName}
      </h1>
      <button
        type="button"
        onClick={startEditing}
        aria-label="Edit tree name"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-muted transition hover:bg-warm-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20 sm:h-9 sm:w-9"
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
