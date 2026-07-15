import { useEffect, useState } from "react";
import clsx from "clsx";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TreePersonNode } from "@/types/api.types";
import { getPersonLabel } from "@/utils/person.utils";

type DeleteMode = "person" | "branch";

interface DeletePersonModalProps {
  person: TreePersonNode | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: (mode: DeleteMode) => void;
}

function countDescendants(person: TreePersonNode): number {
  const visited = new Set<string>();

  const visit = (node: TreePersonNode): number => {
    let count = 0;
    for (const child of node.children) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      count += 1 + visit(child);
    }
    return count;
  };

  return visit(person);
}

interface DeleteOptionProps {
  selected: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}

function DeleteOption({
  selected,
  title,
  description,
  onSelect,
}: DeleteOptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={clsx(
        "w-full rounded-xl border p-4 text-left transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30",
        selected
          ? "border-brand-500 bg-brand-50/40 ring-1 ring-brand-500/20"
          : "border-border-soft bg-white hover:border-warm-200 hover:bg-warm-50/60",
      )}
    >
      <span className="block text-sm font-medium text-text-primary">{title}</span>
      <span className="mt-1 block text-xs leading-relaxed text-text-secondary">
        {description}
      </span>
    </button>
  );
}

export function DeletePersonModal({
  person,
  loading,
  onClose,
  onConfirm,
}: DeletePersonModalProps) {
  const [mode, setMode] = useState<DeleteMode>("person");
  const descendantCount = person ? countDescendants(person) : 0;
  const personName = person ? getPersonLabel(person) : "";
  const descendantLabel =
    descendantCount === 1 ? "1 descendant" : `${descendantCount} descendants`;

  useEffect(() => {
    if (person) setMode("person");
  }, [person?.id]);

  return (
    <Modal
      open={person !== null}
      onClose={onClose}
      title="Delete person?"
      size="md"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => onConfirm(mode)}
            loading={loading}
            className="w-full sm:w-auto"
          >
            {mode === "branch" ? "Delete with children" : "Delete person"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-3 rounded-xl border border-red-100 bg-red-50/70 p-4">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-red-500"
            aria-hidden
          />
          <p className="text-sm leading-relaxed text-text-secondary">
            This will permanently delete{" "}
            <span className="font-medium text-text-primary">{personName}</span>.
            This action cannot be undone.
          </p>
        </div>

        {descendantCount > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-text-primary">
              How should their children be handled?
            </p>
            <div
              role="radiogroup"
              aria-label="Delete scope"
              className="grid gap-2 sm:grid-cols-2"
            >
              <DeleteOption
                selected={mode === "person"}
                title="Delete only this person"
                description={`Keep ${descendantLabel} in the tree.`}
                onSelect={() => setMode("person")}
              />
              <DeleteOption
                selected={mode === "branch"}
                title="Delete with children"
                description={`Remove this person and all ${descendantLabel}.`}
                onSelect={() => setMode("branch")}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">
            This person has no children in the tree.
          </p>
        )}
      </div>
    </Modal>
  );
}
