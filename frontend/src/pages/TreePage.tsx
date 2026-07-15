import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  useTreeView,
  useCreatePerson,
  useAddParent,
  useAddSpouse,
  useRemoveSpouse,
  useUpdatePerson,
  useUpdateTree,
  useDeletePerson,
  useUploadPersonImage,
  useDeletePersonImage,
} from "@/hooks/api/useFamilyTree";
import {
  FamilyTreeView,
  FamilyTreeViewHandle,
} from "@/components/TreeView/FamilyTreeView";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useChatBot } from "@/hooks/useChatBot";
import { PersonFormValues } from "@/validations/family-tree.validation";
import { TreePersonNode, UpdatePersonPayload } from "@/types/api.types";
import { ROUTES } from "@/constants/app.constants";
import { toPersonPayload, toAddParentPayload } from "@/utils/person.utils";
import { findPersonInTree } from "@/utils/tree.utils";
import { announceChatFocusNode } from "@/utils/chat-focus-events";
import { TreeAssistantPane } from "./TreeAssistantPane";
import { ShareModal } from "@/components/ShareModal";
import { TreePageModals, TreePanelMode } from "./TreePageModals";
import { TreePageToolbar } from "./TreePageToolbar";

export function TreePage() {
  const { treeId = "" } = useParams();
  const { data: treeView, isLoading, isError } = useTreeView(treeId);
  const createPersonMutation = useCreatePerson(treeId);
  const addParentMutation = useAddParent(treeId);
  const addSpouseMutation = useAddSpouse(treeId);
  const removeSpouseMutation = useRemoveSpouse(treeId);
  const updatePersonMutation = useUpdatePerson(treeId);
  const updateTreeMutation = useUpdateTree();
  const deletePersonMutation = useDeletePerson(treeId);
  const uploadImageMutation = useUploadPersonImage(treeId);
  const deleteImageMutation = useDeletePersonImage(treeId);
  const { messages, isSending, sendMessage, treeName } = useChatBot(true);

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<TreePanelMode>("none");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches,
  );
  const [personPendingDelete, setPersonPendingDelete] =
    useState<TreePersonNode | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const treeViewRef = useRef<FamilyTreeViewHandle>(null);

  const activePerson = useMemo(() => {
    if (!selectedPersonId || !treeView?.root) return null;
    return findPersonInTree(treeView.root, selectedPersonId);
  }, [selectedPersonId, treeView?.root]);

  const canEdit =
    !treeView || !treeView.tree.role || treeView.tree.role !== "VIEW";

  const openAddRoot = () => {
    if (!canEdit) return;
    setSelectedPersonId(null);
    setPanelMode("add-root");
  };

  const closePanel = () => {
    setSelectedPersonId(null);
    setPanelMode("none");
  };

  const handleNodeClick = (person: TreePersonNode) => {
    setSelectedPersonId(person.id);
    setPanelMode("view");
  };

  const handleCreateRoot = (values: PersonFormValues) => {
    createPersonMutation.mutate(
      { ...toPersonPayload(values), is_root: true, parent_id: null },
      { onSuccess: closePanel },
    );
  };

  const handleCreateChild = (values: PersonFormValues) => {
    if (!activePerson) return;
    createPersonMutation.mutate(
      {
        ...toPersonPayload(values),
        is_root: false,
        parent_id: activePerson.id,
      },
      { onSuccess: closePanel },
    );
  };

  const handleCreateParent = (values: PersonFormValues) => {
    if (!activePerson) return;
    addParentMutation.mutate(
      { personId: activePerson.id, data: toAddParentPayload(values) },
      { onSuccess: closePanel },
    );
  };

  const handleCreateSpouse = (values: PersonFormValues) => {
    if (!activePerson) return;
    addSpouseMutation.mutate(
      {
        personId: activePerson.id,
        data: {
          first_name: values.first_name?.trim(),
          last_name: values.last_name?.trim(),
          gender: values.gender,
          birth_date: values.birth_date?.trim() || null,
          death_date: values.death_date?.trim() || null,
          birth_place: values.birth_place?.trim() || null,
          current_place: values.current_place?.trim() || null,
        },
      },
      { onSuccess: closePanel },
    );
  };

  const handleInlineUpdate = (data: UpdatePersonPayload) => {
    if (!activePerson) return;
    updatePersonMutation.mutate({ personId: activePerson.id, data });
  };

  const handleSearchSelect = (person: TreePersonNode) => {
    announceChatFocusNode(treeId, person.id, { force: true, source: "search" });
    handleNodeClick(person);
  };

  const handleSaveTreeName = (name: string) => {
    updateTreeMutation.mutate({ treeId, data: { name } });
  };

  const handleDownloadPdf = async () => {
    if (!treeView) return;
    try {
      setIsDownloadingPdf(true);
      await treeViewRef.current?.downloadPdf(treeView.tree.name);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[PDF Download]", message);
      toast.error(`Failed to download PDF: ${message}`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-text-secondary">Loading family tree...</p>
      </div>
    );
  }

  if (isError || !treeView) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <p className="font-medium text-text-primary">Failed to load tree</p>
        <p className="text-sm text-text-secondary">
          Please try again or return to your dashboard.
        </p>
        <Link to={ROUTES.DASHBOARD}>
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full animate-fade-in">
      <section className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <TreePageToolbar
          treeName={treeView.tree.name}
          root={treeView.root}
          isDownloadingPdf={isDownloadingPdf}
          canEdit={canEdit}
          isSavingTreeName={updateTreeMutation.isPending}
          onSaveTreeName={handleSaveTreeName}
          onDownloadPdf={handleDownloadPdf}
          onAddRoot={openAddRoot}
          onSearchSelect={handleSearchSelect}
          onShare={() => setShareModalOpen(true)}
        />
        <div className="min-h-0 min-w-0 flex-1 p-3 pt-[154px] sm:p-6 sm:pt-28">
          <FamilyTreeView
            ref={treeViewRef}
            root={treeView.root}
            onNodeClick={handleNodeClick}
            immersive
            centerOnInitialLoad
          />
        </div>
      </section>

      <TreeAssistantPane
        open={assistantOpen}
        messages={messages}
        isSending={isSending}
        treeName={treeName ?? treeView.tree.name}
        onSend={sendMessage}
        onOpen={() => setAssistantOpen(true)}
        onClose={() => setAssistantOpen(false)}
      />

      <TreePageModals
        treeId={treeId}
        panelMode={panelMode}
        activePerson={activePerson}
        personPendingDelete={personPendingDelete}
        canEdit={canEdit}
        createLoading={createPersonMutation.isPending}
        addParentLoading={addParentMutation.isPending}
        updateLoading={updatePersonMutation.isPending}
        deleteLoading={deletePersonMutation.isPending}
        imageUploading={uploadImageMutation.isPending}
        imageDeleting={deleteImageMutation.isPending}
        onClosePanel={closePanel}
        onCloseDelete={() => {
          if (!deletePersonMutation.isPending) setPersonPendingDelete(null);
        }}
        onConfirmDelete={(mode) => {
          if (!personPendingDelete) return;
          deletePersonMutation.mutate(
            { personId: personPendingDelete.id, mode },
            {
              onSuccess: () => {
                setPersonPendingDelete(null);
                closePanel();
              },
            },
          );
        }}
        onCreateRoot={handleCreateRoot}
        onCreateParent={handleCreateParent}
        onCreateChild={handleCreateChild}
        onCreateSpouse={handleCreateSpouse}
        onInlineUpdate={(data) => {
          if (!activePerson || !canEdit) return;
          handleInlineUpdate(data);
        }}
        onAddParent={() => {
          if (!activePerson) return;
          setSelectedPersonId(activePerson.id);
          setPanelMode("add-parent");
        }}
        onAddChild={() => {
          if (!activePerson) return;
          setSelectedPersonId(activePerson.id);
          setPanelMode("add-child");
        }}
        onAddSpouse={() => {
          if (!activePerson) return;
          setSelectedPersonId(activePerson.id);
          setPanelMode("add-spouse");
        }}
        onRemoveSpouse={() => {
          if (!activePerson) return;
          removeSpouseMutation.mutate(activePerson.id);
        }}
        addSpouseLoading={addSpouseMutation.isPending}
        removeSpouseLoading={removeSpouseMutation.isPending}
        onUploadImage={(file) => {
          if (!activePerson) return;
          uploadImageMutation.mutate({ personId: activePerson.id, file });
        }}
        onDeleteImage={() => {
          if (!activePerson) return;
          deleteImageMutation.mutate(activePerson.id);
        }}
        onRequestDelete={() => {
          if (activePerson) setPersonPendingDelete(activePerson);
        }}
      />

      <ShareModal
        treeId={treeId}
        treeName={treeView.tree.name}
        isOwner={!treeView.tree.role || treeView.tree.role === "OWNER"}
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />
    </div>
  );
}
