import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useMatch, useParams } from "react-router-dom";
import { LogIn, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { usePublicTreeView } from "@/hooks/api/useFamilyTree";
import {
  FamilyTreeView,
  FamilyTreeViewHandle,
} from "@/components/TreeView/FamilyTreeView";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ROUTES, STORAGE_KEYS } from "@/constants/app.constants";
import { TreePersonNode } from "@/types/api.types";
import { TreePageToolbar } from "./TreePageToolbar";
import { TreePublicProvider } from "@/contexts/TreePublicContext";
import { useAuth } from "@/providers/AuthProvider";
import clsx from "clsx";

const AUTH_PROMPT_DELAY_MS = 3000;
const AUTH_PROMPT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function shouldShowAuthPrompt(): boolean {
  const dismissedAt = Number(
    localStorage.getItem(STORAGE_KEYS.PUBLIC_AUTH_PROMPT_DISMISSED_AT),
  );

  if (!Number.isFinite(dismissedAt) || dismissedAt <= 0) return true;

  return Date.now() - dismissedAt >= AUTH_PROMPT_COOLDOWN_MS;
}

function rememberAuthPromptDismissed(): void {
  localStorage.setItem(
    STORAGE_KEYS.PUBLIC_AUTH_PROMPT_DISMISSED_AT,
    String(Date.now()),
  );
}

export function PublicTreePage() {
  const { treeId = "" } = useParams();
  const location = useLocation();
  const isPublicTree = !!useMatch({ path: "/public/tree/:id" });
  const { user } = useAuth();
  const { data: treeView, isLoading, isError } = usePublicTreeView(treeId);
  const treeViewRef = useRef<FamilyTreeViewHandle>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const redirectState = {
    from: { pathname: `${location.pathname}${location.search}` },
  };

  useEffect(() => {
    if (user || isLoading || isError || !treeView) return;
    if (!shouldShowAuthPrompt()) return;

    const timer = window.setTimeout(() => {
      setShowAuthPrompt(true);
    }, AUTH_PROMPT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [isError, isLoading, treeView, user]);

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

  const closeAuthPrompt = () => {
    rememberAuthPromptDismissed();
    setShowAuthPrompt(false);
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
            treeDescription={treeView.tree.description}
            root={treeView.root}
            isDownloadingPdf={isDownloadingPdf}
            canEdit={false}
            isSavingTreeName={false}
            onSaveTreeName={() => {}}
            onSaveTreeDescription={() => {}}
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
      {showAuthPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/35 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="public-auth-prompt-title"
        >
          <div className="w-full max-w-md animate-scale-in overflow-hidden rounded-[var(--radius-card)] border border-border-soft bg-white shadow-[var(--shadow-modal)]">
            <div className="flex items-start justify-between gap-4 border-b border-border-subtle bg-gradient-to-b from-brand-50 to-white px-6 py-5">
              <div>
                <p
                  id="public-auth-prompt-title"
                  className="font-serif text-2xl font-normal tracking-tight text-text-primary"
                >
                  Save your family story
                </p>
                <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                  Create a free account or sign in to build your own tree, save
                  edits, and keep exploring MyRoots.
                </p>
              </div>
              <button
                type="button"
                onClick={closeAuthPrompt}
                className="rounded-xl p-2 text-text-muted transition hover:bg-white hover:text-text-secondary"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3 px-6 py-5">
              <Link
                to={ROUTES.SIGNUP}
                state={redirectState}
                onClick={rememberAuthPromptDismissed}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 px-4 text-sm font-medium text-white shadow-sm transition hover:from-brand-600 hover:to-brand-700"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Create account
              </Link>
              <Link
                to={ROUTES.LOGIN}
                state={redirectState}
                onClick={rememberAuthPromptDismissed}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border-soft bg-white px-4 text-sm font-medium text-text-primary shadow-sm transition hover:border-warm-200 hover:bg-warm-50"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Sign in
              </Link>
            </div>
          </div>
        </div>
      )}
    </TreePublicProvider>
  );
}
