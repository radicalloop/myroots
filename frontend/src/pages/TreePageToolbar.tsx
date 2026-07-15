import { useMemo, useState } from "react";
import { Download, MessageCircle, MoveLeft, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { PersonSearch } from "@/components/TreeView/PersonSearch";
import { TreeTitleEditor } from "@/components/TreeView/TreeTitleEditor";
import { Button } from "@/components/ui/Button";
import { Gender, TreePersonNode } from "@/types/api.types";
import { ROUTES } from "@/constants/app.constants";
import { shareTreeSnapshot } from "@/utils/share-tree-snapshot";

interface TreePeopleCounts {
  men: number;
  women: number;
  total: number;
}

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
  onShare?: () => void;
  publicMode?: boolean;
}

function countTreePeople(root: TreePersonNode | null): TreePeopleCounts {
  const counts: TreePeopleCounts = { men: 0, women: 0, total: 0 };
  const visited = new Set<string>();

  const visit = (person: TreePersonNode | null) => {
    if (!person || visited.has(person.id)) return;

    visited.add(person.id);
    counts.total += 1;

    if (person.gender === Gender.MALE) {
      counts.men += 1;
    } else if (person.gender === Gender.FEMALE) {
      counts.women += 1;
    }

    visit(person.spouse);
    person.children.forEach(visit);
  };

  visit(root);
  return counts;
}

function TreePeopleCount({ counts }: { counts: TreePeopleCounts }) {
  if (counts.total === 0) return null;

  const items = [
    { label: "Men", value: counts.men },
    { label: "Women", value: counts.women },
    { label: "Total", value: counts.total },
  ];

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-medium text-text-secondary">
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex h-7 items-center rounded-full border border-brand-100 bg-brand-50/80 px-2.5 text-brand-800"
        >
          {item.label}: {item.value}
        </span>
      ))}
    </div>
  );
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
  onShare,
  publicMode = false,
}: TreePageToolbarProps) {
  const [isSharingSnapshot, setIsSharingSnapshot] = useState(false);
  const counts = useMemo(() => countTreePeople(root), [root]);

  const handleShareSnapshot = async () => {
    if (counts.total === 0) return;

    try {
      setIsSharingSnapshot(true);
      const mode = await shareTreeSnapshot({
        treeName,
        relativesCount: counts.total,
        shareUrl: window.location.href,
      });

      if (mode === "whatsapp") {
        toast.success("Snapshot downloaded and WhatsApp opened");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(
        error instanceof Error ? error.message : "Could not share snapshot",
      );
    } finally {
      setIsSharingSnapshot(false);
    }
  };

  const showSearch = Boolean(root);
  const showAddRoot = !publicMode && !root && canEdit;
  const showActionsBar = showSearch || showAddRoot;
  const mobileActionBtnClass =
    "h-10 w-10 shrink-0 rounded-xl border-border-soft bg-white text-text-primary !px-0 shadow-sm sm:h-11 sm:w-auto sm:!px-5";
  const actionIconClass = "h-4 w-4 shrink-0 text-text-primary";

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
            <TreePeopleCount counts={counts} />
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-text-primary sm:text-2xl">
              {treeName}
            </h1>
            <TreePeopleCount counts={counts} />
          </>
        )}
      </div>

      {showActionsBar && (
        <div className="pointer-events-auto flex w-full flex-col gap-2 rounded-2xl border border-white/70 bg-white/90 p-1.5 shadow-[0_8px_30px_rgba(31,41,35,0.08)] backdrop-blur-xl sm:w-auto sm:shrink-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-0">
          {showSearch && root ? (
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-stretch">
              <PersonSearch
                root={root}
                onSelect={onSearchSelect}
                className="w-full min-w-0 sm:w-72 sm:flex-none sm:max-w-none lg:w-80"
              />
              <div className="flex shrink-0 items-stretch gap-2">
                {!publicMode && (
                  <>
                    {onShare && (
                      <Button
                        variant="secondary"
                        onClick={onShare}
                        className={mobileActionBtnClass}
                        aria-label="Share tree"
                      >
                        <Share2 className={actionIconClass} aria-hidden="true" />
                        <span className="hidden sm:inline">Share</span>
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      onClick={handleShareSnapshot}
                      loading={isSharingSnapshot}
                      className={mobileActionBtnClass}
                      aria-label="Share relatives card on WhatsApp"
                    >
                      <MessageCircle className={actionIconClass} aria-hidden="true" />
                      <span className="hidden sm:inline">Card</span>
                    </Button>
                  </>
                )}
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
