import { DeletePersonModal } from "@/components/DeletePersonModal";
import { PersonForm } from "@/components/PersonForm/PersonForm";
import { Modal } from "@/components/ui/Modal";
import {
  PersonViewBody,
  PersonViewHeader,
} from "@/components/PersonView/PersonViewPanel";
import { PersonFormValues } from "@/validations/family-tree.validation";
import { TreePersonNode, UpdatePersonPayload } from "@/types/api.types";
import { getSpouseDefaultGender } from "@/utils/person.utils";

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
  activeFamilyChildren: TreePersonNode[];
  personPendingDelete: TreePersonNode | null;
  pendingDeleteDescendantCount: number;
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
  activeFamilyChildren,
  personPendingDelete,
  pendingDeleteDescendantCount,
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
            familyChildren={activeFamilyChildren}
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
            key={activePerson?.id}
            defaultValues={
              activePerson
                ? { gender: getSpouseDefaultGender(activePerson.gender) }
                : undefined
            }
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

      <DeletePersonModal
        person={personPendingDelete}
        descendantCount={pendingDeleteDescendantCount}
        loading={deleteLoading}
        onClose={onCloseDelete}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}
