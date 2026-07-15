import { useState } from "react";
import { Download, MoveLeft, Share2, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { PersonSearch } from "@/components/TreeView/PersonSearch";
import { TreeTitleEditor } from "@/components/TreeView/TreeTitleEditor";
import { Button } from "@/components/ui/Button";
import { TreePersonNode } from "@/types/api.types";
import { ROUTES } from "@/constants/app.constants";

interface TreePageToolbarProps {
  treeName: string;
  root: TreePersonNode | null;
  isDownloadingPdf: boolean;
  canEdit: boolean;
  isSavingTreeName?: boolean;
  onSaveTreeName: (name: string) => void;
  onDownloadPdf: () => void;
  onAddRoot: () => void;
  onSearchSelect: (person: TreePersonNode) => void;
  publicMode?: boolean;
}

export function TreePageToolbar({
  treeName,
  root,
  isDownloadingPdf,
  canEdit,
  isSavingTreeName = false,
  onSaveTreeName,
  onDownloadPdf,
  onAddRoot,
  onSearchSelect,
  publicMode = false,
}: TreePageToolbarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-8 sm:py-5">
      <div className="pointer-events-auto rounded-2xl border border-white/70 bg-white/90 px-3.5 py-3 shadow-[0_8px_30px_rgba(31,41,35,0.08)] backdrop-blur-xl sm:min-w-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none sm:backdrop-blur-0">
        {!publicMode ? (
          <>
            <Link
              to={ROUTES.DASHBOARD}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 transition-colors hover:text-brand-800 sm:text-sm sm:font-medium"
            >
              <MoveLeft size={14} />
              Back to dashboard
            </Link>
            <TreeTitleEditor
              treeName={treeName}
              onSave={onSaveTreeName}
              isSaving={isSavingTreeName}
            />
          </>
        ) : (
          <h1 className="text-xl font-semibold text-text-primary sm:text-2xl">
            {treeName}
          </h1>
        )}
      </div>

      {!publicMode && (
        <div className="pointer-events-auto flex w-full items-stretch gap-2 rounded-2xl border border-white/70 bg-white/90 p-1.5 shadow-[0_8px_30px_rgba(31,41,35,0.08)] backdrop-blur-xl sm:w-auto sm:shrink-0 sm:flex-wrap sm:items-center sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-0">
          {root ? (
            <>
              <PersonSearch
                root={root}
                onSelect={onSearchSelect}
                className="min-w-0 flex-1 max-w-none sm:w-72 sm:flex-none sm:max-w-none lg:w-80"
              />
              <Button
                variant="secondary"
                onClick={handleCopyLink}
                className="h-auto w-12 shrink-0 gap-2 rounded-xl border-white/70 bg-white !px-0 shadow-none sm:h-11 sm:w-auto sm:rounded-xl sm:border-border-soft sm:bg-white sm:!px-5 sm:shadow-sm"
                aria-label={copied ? "Link copied" : "Copy share link"}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
                ) : (
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                )}
                <span className="hidden sm:inline">
                  {copied ? "Copied" : "Share"}
                </span>
              </Button>
              <Button
                variant="secondary"
                onClick={onDownloadPdf}
                loading={isDownloadingPdf}
                className="h-auto w-12 shrink-0 gap-2 rounded-xl border-white/70 bg-white !px-0 shadow-none sm:h-11 sm:w-auto sm:rounded-xl sm:border-border-soft sm:bg-white sm:!px-5 sm:shadow-sm"
                aria-label="Download PDF"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Download PDF</span>
              </Button>
            </>
          ) : canEdit ? (
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
