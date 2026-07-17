import { Download, MoveLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import { PersonSearch } from "@/components/TreeView/PersonSearch";
import { MemberStatsBar } from "@/components/MemberStatsBar";
import { TreeDescriptionEditor } from "@/components/TreeView/TreeDescriptionEditor";
import { TreeTitleEditor } from "@/components/TreeView/TreeTitleEditor";
import { Button } from "@/components/ui/Button";
import { TreePersonNode } from "@/types/api.types";
import { ROUTES } from "@/constants/app.constants";
import { countTreePeople } from "@/utils/tree.utils";
import { cn } from "@/lib/utils";

interface TreePageToolbarProps {
  treeName: string;
  treeDescription: string | null;
  root: TreePersonNode | null;
  isDownloadingPdf: boolean;
  canEdit: boolean;
  isSavingTreeName?: boolean;
  onSaveTreeName: (name: string) => void;
  onSaveTreeDescription: (description: string) => void;
  onDownloadPdf: () => void;
  onAddRoot: () => void;
  onSearchSelect: (person: TreePersonNode) => void;
  onShare?: () => void;
  publicMode?: boolean;
}

export function TreePageToolbar({
  treeName,
  treeDescription,
  root,
  isDownloadingPdf,
  canEdit,
  isSavingTreeName = false,
  onSaveTreeName,
  onSaveTreeDescription,
  onDownloadPdf,
  onAddRoot,
  onSearchSelect,
  publicMode = false,
}: TreePageToolbarProps) {
  const showSearch = !publicMode && Boolean(root);
  const showAddRoot = !publicMode && !root && canEdit;
  const showActionsBar = showSearch || showAddRoot;
  const memberCounts = useMemo(
    () => (root ? countTreePeople(root) : null),
    [root],
  );
  const mobileActionBtnClass =
    "h-10 w-10 shrink-0 rounded-xl border-border-soft bg-white text-text-primary !px-0 shadow-sm sm:h-11 sm:w-auto sm:!px-5";
  const actionIconClass = "h-4 w-4 shrink-0 text-text-primary";

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 md:gap-4 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-8 sm:py-5">
      <div className="pointer-events-auto rounded-2xl border border-white/70 bg-white/90 px-3.5 py-3 shadow-[0_8px_30px_rgba(31,41,35,0.08)] backdrop-blur-xl sm:min-w-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none sm:backdrop-blur-0">
        {!publicMode ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <Link
                to={ROUTES.DASHBOARD}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 transition-colors hover:text-brand-800 sm:text-sm sm:font-medium"
              >
                <MoveLeft size={14} />
                Back to dashboard
              </Link>
              {showSearch && (
                <Button
                  variant="secondary"
                  onClick={onDownloadPdf}
                  loading={isDownloadingPdf}
                  className={`${mobileActionBtnClass} md:!hidden !size-9`}
                  aria-label="Download PDF"
                >
                  <Download className={actionIconClass} aria-hidden="true" />
                </Button>
              )}
            </div>
            <TreeTitleEditor
              treeName={treeName}
              onSave={onSaveTreeName}
              isSaving={isSavingTreeName}
            />
            <TreeDescriptionEditor
              description={treeDescription}
              onSave={onSaveTreeDescription}
              isSaving={isSavingTreeName}
            />
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-text-primary sm:text-2xl">
              {treeName}
            </h1>
            {treeDescription?.trim() ? (
              <p className="mt-0.5 max-w-md truncate text-xs leading-snug text-text-secondary">
                {treeDescription.trim()}
              </p>
            ) : null}
          </>
        )}
      </div>

      {showActionsBar && (
        <div
          className={cn(
            "pointer-events-auto flex w-full flex-col gap-2 rounded-2xl border border-white/70 bg-white/90 shadow-[0_8px_30px_rgba(31,41,35,0.08)] backdrop-blur-xl sm:w-auto sm:shrink-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-0",
            showSearch &&
              "max-sm:mt-3 max-sm:p-2.5 max-sm:ring-1 max-sm:ring-border-soft/40",
            showAddRoot && !showSearch && "max-sm:hidden sm:p-0",
          )}
        >
          {showSearch && root ? (
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2">
              <PersonSearch
                root={root}
                onSelect={onSearchSelect}
                className="w-full min-w-0 sm:w-72 sm:flex-none sm:max-w-none lg:w-80"
              />
              {memberCounts && memberCounts.total > 0 ? (
                <MemberStatsBar counts={memberCounts} className="sm:hidden" />
              ) : null}
              <div className="hidden shrink-0 items-stretch gap-2 sm:flex">
                <Button
                  variant="secondary"
                  onClick={onDownloadPdf}
                  loading={isDownloadingPdf}
                  className={mobileActionBtnClass}
                  aria-label="Download PDF"
                >
                  <Download className={actionIconClass} aria-hidden="true" />
                  <span className="hidden sm:inline">Download PDF</span>
                </Button>
              </div>
            </div>
          ) : showAddRoot ? (
            <Button
              onClick={onAddRoot}
              className="w-full rounded-2xl shadow-md sm:w-auto"
            >
              Add root person
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
