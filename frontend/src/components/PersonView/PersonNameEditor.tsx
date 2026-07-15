import clsx from "clsx";
import { Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface PersonNameEditorProps {
  firstName: string;
  lastName: string;
  disabled?: boolean;
  onSave: (firstName: string, lastName: string) => void;
  onCancel: () => void;
}

const nameInputClass =
  "w-full rounded-lg border border-border-soft bg-white px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted hover:border-warm-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 disabled:opacity-60";

export function PersonNameEditor({
  firstName: initialFirstName,
  lastName: initialLastName,
  disabled = false,
  onSave,
  onCancel,
}: PersonNameEditorProps) {
  const firstNameRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(initialFirstName);
    setLastName(initialLastName);
    setError(null);
  }, [initialFirstName, initialLastName]);

  useEffect(() => {
    firstNameRef.current?.focus();
    firstNameRef.current?.select();
  }, []);

  const handleSave = () => {
    const nextFirstName = firstName.trim();
    const nextLastName = lastName.trim();

    if (!nextFirstName || !nextLastName) {
      setError("First name and last name are required");
      return;
    }

    onSave(nextFirstName, nextLastName);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSave();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="mx-auto w-full max-w-md text-left">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="person-first-name"
            className="mb-1 block text-xs font-medium text-text-muted capitalize"
          >
            First name
          </label>
          <input
            id="person-first-name"
            ref={firstNameRef}
            value={firstName}
            disabled={disabled}
            maxLength={100}
            onChange={(event) => {
              setFirstName(event.target.value);
              if (error) setError(null);
            }}
            onKeyDown={handleKeyDown}
            className={clsx(
              nameInputClass,
              error && "border-red-300 focus:border-red-400",
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <label
            htmlFor="person-last-name"
            className="mb-1 block text-xs font-medium text-text-muted capitalize"
          >
            Last name
          </label>
          <input
            id="person-last-name"
            value={lastName}
            disabled={disabled}
            maxLength={100}
            onChange={(event) => {
              setLastName(event.target.value);
              if (error) setError(null);
            }}
            onKeyDown={handleKeyDown}
            className={clsx(
              nameInputClass,
              error && "border-red-300 focus:border-red-400",
            )}
          />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            aria-label="Cancel editing"
            className="flex h-9.5 w-9.5 items-center justify-center rounded-lg border border-border-soft bg-white text-text-muted transition hover:bg-warm-50 hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20 disabled:opacity-60"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={disabled}
            aria-label="Save name"
            className="flex h-9.5 w-9.5 items-center justify-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 disabled:opacity-60"
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
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
