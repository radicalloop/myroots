import dayjs from "dayjs";
import clsx from "clsx";
import {
  Calendar,
  ChevronDown,
  GitBranchPlus,
  Heart,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  UserRoundPlus,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ProfilePhotoSection } from "@/components/ProfilePhoto/ProfilePhotoSection";
import { PersonNameEditor } from "@/components/PersonView/PersonNameEditor";
import { Button } from "@/components/ui/Button";
import { ModalCloseButton } from "@/components/ui/Modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Gender, TreePersonNode, UpdatePersonPayload } from "@/types/api.types";
import {
  getFutureDateError,
  getPersonLabel,
  isFutureDate,
  todayInputDate,
} from "@/utils/person.utils";

interface PersonViewHeaderProps {
  person: TreePersonNode;
  treeId: string;
  canEdit: boolean;
  onClose: () => void;
  onUploadImage: (file: File) => void;
  onDeleteImage: () => void;
  onUpdate: (payload: UpdatePersonPayload) => void;
  onDelete: () => void;
  imageUploading?: boolean;
  imageDeleting?: boolean;
  updateLoading?: boolean;
  deleteLoading?: boolean;
}

interface PersonViewBodyProps {
  person: TreePersonNode;
  canEdit: boolean;
  onAddParent: () => void;
  onAddChild: () => void;
  onAddSpouse: () => void;
  onRemoveSpouse: () => void;
  removeSpouseLoading?: boolean;
  onUpdate: (payload: UpdatePersonPayload) => void;
  updateLoading?: boolean;
}

type EditableField =
  | "birth_date"
  | "death_date"
  | "birth_place"
  | "current_place"
  | "health_note";

function formatGender(gender: Gender): string {
  return gender.charAt(0) + gender.slice(1).toLowerCase();
}

function formatDate(date: string | null): string {
  if (!date) return "";
  return dayjs(date).format("MMM D, YYYY");
}

function getAge(person: TreePersonNode): string | null {
  if (!person.birth_date) return null;

  const birth = dayjs(person.birth_date);
  const end = person.death_date ? dayjs(person.death_date) : dayjs();
  const years = end.diff(birth, "year");

  if (!Number.isFinite(years) || years < 0) return null;
  return `${years} years old`;
}

function toInputDate(date: string | null): string {
  return date ? dayjs(date).format("YYYY-MM-DD") : "";
}

function initialsFor(person: TreePersonNode): string {
  return `${person.first_name[0] ?? ""}${person.last_name[0] ?? ""}`.toUpperCase();
}

function FieldInput({
  type,
  value,
  autoFocus,
  disabled,
  onCancel,
  onSave,
}: {
  type: "date" | "text";
  value: string;
  autoFocus?: boolean;
  disabled?: boolean;
  onCancel: () => void;
  onSave: (value: string) => boolean | void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const save = () => {
    const trimmed = draft.trim();
    const result = onSave(trimmed);
    if (result === false) {
      setDraft(value);
    }
  };

  return (
    <input
      type={type}
      value={draft}
      autoFocus={autoFocus}
      disabled={disabled}
      max={type === "date" ? todayInputDate() : undefined}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }

        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      className="mt-1.5 w-full rounded-md border border-brand-200 bg-white px-2 py-1 text-xs font-medium text-text-primary outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 disabled:opacity-60"
    />
  );
}

function DetailCard({
  icon,
  label,
  value,
  emptyLabel,
  type,
  editing,
  disabled,
  onEdit,
  onCancel,
  onSave,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  emptyLabel: string;
  type: "date" | "text";
  editing: boolean;
  disabled?: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (value: string) => boolean | void;
}) {
  const hasValue = value.trim().length > 0;

  return (
    <button
      type="button"
      onClick={editing ? undefined : onEdit}
      className={clsx(
        "group rounded-lg border border-border-subtle bg-warm-50/40 px-2.5 py-2 text-left transition-colors",
        "hover:border-brand-200 hover:bg-white",
        !editing && "cursor-pointer",
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
        <span className="text-text-muted/80">{icon}</span>
        {label}
      </div>

      {editing ? (
        <FieldInput
          type={type}
          value={value}
          autoFocus
          disabled={disabled}
          onCancel={onCancel}
          onSave={onSave}
        />
      ) : (
        <div
          className={clsx(
            "mt-0.5 flex items-center gap-1 text-xs font-medium",
            hasValue ? "text-text-primary" : "text-brand-600",
          )}
        >
          {!hasValue && (
            <Plus className="h-3 w-3 shrink-0" aria-hidden="true" />
          )}
          <span className="truncate text-sm">
            {hasValue ? value : emptyLabel}
          </span>
        </div>
      )}
    </button>
  );
}

export function PersonViewHeader({
  person,
  treeId,
  canEdit,
  onClose,
  onUploadImage,
  onDeleteImage,
  onUpdate,
  onDelete,
  imageUploading,
  imageDeleting,
  updateLoading,
  deleteLoading,
}: PersonViewHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const birthYear = person.birth_date
    ? dayjs(person.birth_date).format("YYYY")
    : null;
  const age = getAge(person);

  useEffect(() => {
    setIsEditingName(false);
  }, [person.id, person.first_name, person.last_name]);

  const saveName = (nextFirstName: string, nextLastName: string) => {
    setIsEditingName(false);

    if (
      nextFirstName !== person.first_name ||
      nextLastName !== person.last_name
    ) {
      onUpdate({ first_name: nextFirstName, last_name: nextLastName });
    }
  };

  const cancelName = () => {
    setIsEditingName(false);
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-brand-50/80 via-white to-white px-4 pt-3 pb-1 text-center">
      <div className="absolute inset-x-0 top-0 h-16 bg-[radial-gradient(circle_at_50%_0%,rgba(63,185,124,0.1),transparent_70%)]" />

      <div className="relative z-10 flex items-center justify-between">
        <button
          type="button"
          onClick={onDelete}
          disabled={deleteLoading}
          aria-label="Delete person"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-500 shadow-sm backdrop-blur transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25 disabled:opacity-60"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <ModalCloseButton onClose={onClose} />
      </div>

      <div className="relative z-10 mx-auto -mt-0.5 w-fit">
        <ProfilePhotoSection
          treeId={treeId}
          personId={person.id}
          firstName={person.first_name}
          lastName={person.last_name}
          profileImagePath={person.profile_image_path}
          canEdit={canEdit}
          uploading={imageUploading}
          deleting={imageDeleting}
          onUpload={onUploadImage}
          onDelete={onDeleteImage}
        />
      </div>

      <div className="mt-2.5">
        {isEditingName ? (
          <PersonNameEditor
            firstName={person.first_name}
            lastName={person.last_name}
            disabled={updateLoading}
            onSave={saveName}
            onCancel={cancelName}
          />
        ) : (
          <button
            type="button"
            onClick={() => canEdit && setIsEditingName(true)}
            className="group inline-flex max-w-full items-center justify-center gap-1.5 rounded-md px-2 py-0.5 transition hover:bg-warm-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20"
          >
            <h3 className="break-words font-serif text-lg font-medium leading-tight text-text-primary capitalize">
              {getPersonLabel(person)}
            </h3>
            {canEdit && (
              <Pencil
                className="h-3.5 w-3.5 shrink-0 text-text-muted transition "
                aria-hidden="true"
              />
            )}
          </button>
        )}

        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 flex-col">
          {birthYear && (
            <p className="text-xs text-text-secondary">
              {`B. ${birthYear}`}
              {age && (
                <>
                  <span className="mx-1.5 text-text-muted">·</span>
                  {age}
                </>
              )}
            </p>
          )}

          {canEdit ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={updateLoading}
                  className="inline-flex h-6 items-center gap-1 rounded-full bg-warm-100 px-2.5 text-[11px] font-semibold text-olive-600 transition hover:bg-warm-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25 disabled:opacity-60"
                >
                  {formatGender(person.gender)}
                  <ChevronDown className="h-3 w-3" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-32">
                {Object.values(Gender).map((gender) => (
                  <DropdownMenuItem
                    key={gender}
                    onSelect={() => {
                      if (gender !== person.gender) onUpdate({ gender });
                    }}
                  >
                    {formatGender(gender)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="inline-flex h-6 items-center rounded-full bg-warm-100 px-2.5 text-[11px] font-semibold text-olive-600">
              {formatGender(person.gender)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function PersonViewBody({
  person,
  canEdit,
  onAddParent,
  onAddChild,
  onAddSpouse,
  onRemoveSpouse,
  removeSpouseLoading,
  onUpdate,
  updateLoading,
}: PersonViewBodyProps) {
  const [editingField, setEditingField] = useState<EditableField | null>(null);

  useEffect(() => {
    setEditingField(null);
  }, [person.id]);

  const saveField = (field: EditableField, value: string): boolean => {
    const normalized = value.trim() || null;
    const current =
      field === "birth_date" || field === "death_date"
        ? toInputDate(person[field])
        : (person[field] ?? "");
    const next =
      field === "birth_date" || field === "death_date"
        ? value || null
        : normalized;

    if ((field === "birth_date" || field === "death_date") && next) {
      if (isFutureDate(next)) {
        toast.error(getFutureDateError(field));
        return false;
      }
    }

    if ((next ?? "") === current) {
      setEditingField(null);
      return true;
    }

    setEditingField(null);
    onUpdate({ [field]: next } as UpdatePersonPayload);
    return true;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <DetailCard
          icon={<Calendar className="h-3 w-3" aria-hidden="true" />}
          label="Born"
          value={
            editingField === "birth_date"
              ? toInputDate(person.birth_date)
              : formatDate(person.birth_date)
          }
          emptyLabel="Add date"
          type="date"
          editing={editingField === "birth_date"}
          disabled={updateLoading}
          onEdit={() => canEdit && setEditingField("birth_date")}
          onCancel={() => setEditingField(null)}
          onSave={(value) => saveField("birth_date", value)}
        />
        <DetailCard
          icon={<Calendar className="h-3 w-3" aria-hidden="true" />}
          label="Died"
          value={
            editingField === "death_date"
              ? toInputDate(person.death_date)
              : formatDate(person.death_date)
          }
          emptyLabel="Add date"
          type="date"
          editing={editingField === "death_date"}
          disabled={updateLoading}
          onEdit={() => canEdit && setEditingField("death_date")}
          onCancel={() => setEditingField(null)}
          onSave={(value) => saveField("death_date", value)}
        />
        <DetailCard
          icon={<MapPin className="h-3 w-3" aria-hidden="true" />}
          label="Birthplace"
          value={person.birth_place ?? ""}
          emptyLabel="Add place"
          type="text"
          editing={editingField === "birth_place"}
          disabled={updateLoading}
          onEdit={() => canEdit && setEditingField("birth_place")}
          onCancel={() => setEditingField(null)}
          onSave={(value) => saveField("birth_place", value)}
        />
        <DetailCard
          icon={<MapPin className="h-3 w-3" aria-hidden="true" />}
          label="Lives in"
          value={person.current_place ?? ""}
          emptyLabel="Add place"
          type="text"
          editing={editingField === "current_place"}
          disabled={updateLoading}
          onEdit={() => canEdit && setEditingField("current_place")}
          onCancel={() => setEditingField(null)}
          onSave={(value) => saveField("current_place", value)}
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
          <span className="text-text-muted/80">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </span>
          Health note
        </div>
        {editingField === "health_note" ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              disabled={updateLoading}
              defaultValue={person.health_note ?? ''}
              rows={3}
              onBlur={(e) => saveField("health_note", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  setEditingField(null);
                }
              }}
              className="w-full rounded-md border border-brand-200 bg-white px-2 py-1.5 text-xs font-medium text-text-primary outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 disabled:opacity-60 resize-y"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="rounded-md px-2 py-1 text-xs text-text-muted hover:bg-warm-100 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => canEdit && setEditingField("health_note")}
            className={clsx(
              "group w-full rounded-lg border border-border-subtle bg-warm-50/40 px-2.5 py-2 text-left transition-colors",
              "hover:border-brand-200 hover:bg-white",
              canEdit && "cursor-pointer",
            )}
          >
            {person.health_note ? (
              <p className="text-sm text-text-primary whitespace-pre-wrap">
                {person.health_note}
              </p>
            ) : (
              <div className="flex items-center gap-1 text-xs font-medium text-brand-600">
                <Plus className="h-3 w-3 shrink-0" aria-hidden="true" />
                Add health note
              </div>
            )}
          </button>
        )}
      </div>

      {person.children.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Family
            </h4>
            <span className="text-xs text-text-muted">
              {person.children.length}{" "}
              {person.children.length === 1 ? "child" : "children"}
            </span>
          </div>
          <div className="custom-scrollbar flex gap-2 overflow-x-auto pb-0.5">
            {person.children.map((child) => (
              <div
                key={child.id}
                className="flex min-w-[130px] items-center gap-2 rounded-lg border border-border-subtle bg-white px-2 py-1.5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                  {initialsFor(child)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-text-primary capitalize">
                    {getPersonLabel(child)}
                  </span>
                  <span className="block text-[10px] text-text-muted">
                    Child
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="border-t border-border-subtle pt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Add to tree
        </p>

        {person.spouse ? (
          <div className="mb-2.5 rounded-lg border border-border-subtle bg-warm-50/40 px-2.5 py-2">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                Spouse
              </span>
              <button
                type="button"
                onClick={onRemoveSpouse}
                disabled={removeSpouseLoading}
                className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                aria-label="Remove spouse"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                {initialsFor(person.spouse)}
              </span>
              <span className="min-w-0 truncate text-xs font-semibold text-text-primary capitalize">
                {getPersonLabel(person.spouse)}
              </span>
            </div>
          </div>
        ) : (
          <div className="mb-2.5">
            <Button
              onClick={onAddSpouse}
              variant="secondary"
              size="sm"
              className="h-8 w-full gap-1.5 rounded-lg text-xs"
            >
              <Heart className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {person.gender === "MALE"
                ? "Add wife"
                : person.gender === "FEMALE"
                  ? "Add husband"
                  : "Add spouse"}
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={onAddParent}
            size="sm"
            className="h-8 gap-1.5 rounded-lg text-xs"
          >
            <UserRoundPlus
              className="h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            />
            Add parent
          </Button>
          <Button
            onClick={onAddChild}
            size="sm"
            className="h-8 gap-1.5 rounded-lg text-xs"
          >
            <GitBranchPlus
              className="h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            />
            Add child
          </Button>
        </div>
      </div>
    </div>
  );
}
