import { useRef, useState } from "react";
import { Link, useLocation, useMatch, useParams } from "react-router-dom";
import { toast } from "sonner";
import { usePublicTreeView } from "@/hooks/api/useFamilyTree";
import {
  FamilyTreeView,
  FamilyTreeViewHandle,
} from "@/components/TreeView/FamilyTreeView";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ROUTES } from "@/constants/app.constants";
import { TreePersonNode } from "@/types/api.types";
import { TreePageToolbar } from "./TreePageToolbar";
import { TreePublicProvider } from "@/contexts/TreePublicContext";
import clsx from "clsx";

export function PublicTreePage() {
  const { treeId = "" } = useParams();
  const isPublicTree = !!useMatch({ path: "/public/tree/:id" });

  const { data: treeView, isLoading, isError } = usePublicTreeView(treeId);
  const treeViewRef = useRef<FamilyTreeViewHandle>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleSearchSelect = (person: TreePersonNode) => {
    treeViewRef.current?.focusPerson(person.id);
  };

  const handleDownloadPdf = async () => {
    if (!treeView) return;

    try {
      setIsDownloadingPdf(true);
      await treeViewRef.current?.downloadPdf(treeView.tree.name);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
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
    <TreePublicProvider isPublic>
      <div className="flex h-full min-h-0 w-full animate-fade-in">
        <section className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <TreePageToolbar
            treeName={treeView.tree.name}
            root={treeView.root}
            isDownloadingPdf={isDownloadingPdf}
            canEdit={false}
            isSavingTreeName={false}
            onSaveTreeName={() => {}}
            onDownloadPdf={handleDownloadPdf}
            onAddRoot={() => {}}
            onSearchSelect={handleSearchSelect}
            publicMode
          />
          <div
            className={clsx(
              "min-h-0 min-w-0 flex-1 p-3 pt-36 sm:p-6 sm:pt-28",
              isPublicTree && "!pt-[78px]",
            )}
          >
            <FamilyTreeView
              ref={treeViewRef}
              root={treeView.root}
              onNodeClick={() => {}}
              immersive
              centerOnInitialLoad
            />
          </div>
        </section>
      </div>
    </TreePublicProvider>
  );
}
