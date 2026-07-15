import { PersonForm } from "@/components/PersonForm/PersonForm";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  PersonViewBody,
  PersonViewHeader,
} from "@/components/PersonView/PersonViewPanel";
import { PersonFormValues } from "@/validations/family-tree.validation";
import { TreePersonNode, UpdatePersonPayload } from "@/types/api.types";

export type TreePanelMode =
  | "none"
  | "add-root"
  | "add-parent"
  | "add-child"
  | "add-spouse"
  | "view";

interface TreePageModalsProps {
  treeId: string;
  panelMode: TreePanelMode;
  activePerson: TreePersonNode | null;
  personPendingDelete: TreePersonNode | null;
  canEdit: boolean;
  createLoading: boolean;
  addParentLoading: boolean;
  addSpouseLoading: boolean;
  removeSpouseLoading: boolean;
  updateLoading: boolean;
  deleteLoading: boolean;
  imageUploading: boolean;
  imageDeleting: boolean;
  onClosePanel: () => void;
  onCloseDelete: () => void;
  onConfirmDelete: (mode: "person" | "branch") => void;
  onCreateRoot: (values: PersonFormValues) => void;
  onCreateParent: (values: PersonFormValues) => void;
  onCreateChild: (values: PersonFormValues) => void;
  onCreateSpouse: (values: PersonFormValues) => void;
  onInlineUpdate: (data: UpdatePersonPayload) => void;
  onAddParent: () => void;
  onAddChild: () => void;
  onAddSpouse: () => void;
  onRemoveSpouse: () => void;
  onUploadImage: (file: File) => void;
  onDeleteImage: () => void;
  onRequestDelete: () => void;
}

export function TreePageModals({
  treeId,
  panelMode,
  activePerson,
  personPendingDelete,
  canEdit,
  createLoading,
  addParentLoading,
  addSpouseLoading,
  removeSpouseLoading,
  updateLoading,
  deleteLoading,
  imageUploading,
  imageDeleting,
  onClosePanel,
  onCloseDelete,
  onConfirmDelete,
  onCreateRoot,
  onCreateParent,
  onCreateChild,
  onCreateSpouse,
  onInlineUpdate,
  onAddParent,
  onAddChild,
  onAddSpouse,
  onRemoveSpouse,
  onUploadImage,
  onDeleteImage,
  onRequestDelete,
}: TreePageModalsProps) {
  const descendantCount = personPendingDelete
    ? countDescendants(personPendingDelete)
    : 0;

  return (
    <>
      <Modal
        open={panelMode !== "none"}
        onClose={onClosePanel}
        size={panelMode === "view" ? "xl" : "lg"}
        bodyClassName={
          panelMode !== "view"
            ? "flex min-h-0 flex-1 flex-col overflow-hidden p-0"
            : undefined
        }
        title={
          panelMode === "add-root"
            ? "Add root person"
            : panelMode === "add-parent"
              ? "Add parent"
              : panelMode === "add-child"
                ? "Add child"
                : panelMode === "add-spouse" && activePerson
                  ? activePerson.gender === "MALE"
                    ? "Add wife"
                    : activePerson.gender === "FEMALE"
                      ? "Add husband"
                      : "Add spouse"
                  : undefined
        }
        description={
          (panelMode === "add-parent" || panelMode === "add-child" || panelMode === "add-spouse") &&
          activePerson
            ? panelMode === "add-parent"
              ? `Parent of ${activePerson.first_name} ${activePerson.last_name}`
              : panelMode === "add-child"
                ? `Child of ${activePerson.first_name} ${activePerson.last_name}`
                : `Spouse of ${activePerson.first_name} ${activePerson.last_name}`
            : undefined
        }
        header={
          panelMode === "view" && activePerson ? (
            <PersonViewHeader
              person={activePerson}
              treeId={treeId}
              canEdit={canEdit}
              onClose={onClosePanel}
              imageUploading={imageUploading}
              imageDeleting={imageDeleting}
              onUploadImage={onUploadImage}
              onDeleteImage={onDeleteImage}
              onUpdate={onInlineUpdate}
              updateLoading={updateLoading}
              deleteLoading={deleteLoading}
              onDelete={onRequestDelete}
            />
          ) : undefined
        }
      >
        {panelMode === "view" && activePerson && (
          <PersonViewBody
            person={activePerson}
            canEdit={canEdit}
            onAddParent={onAddParent}
            onAddChild={onAddChild}
            onAddSpouse={onAddSpouse}
            onRemoveSpouse={onRemoveSpouse}
            removeSpouseLoading={removeSpouseLoading}
            onUpdate={onInlineUpdate}
            updateLoading={updateLoading}
          />
        )}

        {panelMode === "add-root" && canEdit && (
          <PersonForm
            onSubmit={onCreateRoot}
            loading={createLoading}
            submitLabel="Add root person"
          />
        )}

        {panelMode === "add-parent" && canEdit && (
          <PersonForm
            onSubmit={onCreateParent}
            loading={addParentLoading}
            submitLabel="Add parent"
          />
        )}

        {panelMode === "add-child" && canEdit && (
          <PersonForm
            onSubmit={onCreateChild}
            loading={createLoading}
            submitLabel="Add child"
          />
        )}

        {panelMode === "add-spouse" && canEdit && (
          <PersonForm
            onSubmit={onCreateSpouse}
            loading={addSpouseLoading}
            submitLabel={activePerson
              ? activePerson.gender === "MALE"
                ? "Add wife"
                : activePerson.gender === "FEMALE"
                  ? "Add husband"
                  : "Add spouse"
              : "Add spouse"
            }
          />
        )}
      </Modal>

      <Modal
        open={personPendingDelete !== null}
        onClose={onCloseDelete}
        title="Delete person?"
        description={
          personPendingDelete
            ? `This will permanently delete ${personPendingDelete.first_name} ${personPendingDelete.last_name} and cannot be undone.`
            : undefined
        }
        size="sm"
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={onCloseDelete}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => onConfirmDelete("person")}
              loading={deleteLoading}
            >
              Delete only this person
            </Button>
            {descendantCount > 0 && (
              <Button
                variant="danger"
                onClick={() => onConfirmDelete("branch")}
                loading={deleteLoading}
              >
                Delete with children
              </Button>
            )}
          </div>
        }
      >
        <p className="text-sm text-text-secondary">
          Choose how to handle this person's children.
          {descendantCount > 0
            ? ` ${descendantCount} child/descendant record${
                descendantCount === 1 ? "" : "s"
              } can either be kept in the tree or deleted with this person.`
            : " This person has no children in the tree."}
        </p>
      </Modal>
    </>
  );
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
