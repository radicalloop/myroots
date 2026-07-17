import { Link } from "react-router-dom";
import { TreePine, Trash2, ArrowRight, Share2 } from "lucide-react";
import { MemberStatsBar } from "@/components/MemberStatsBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ROUTES } from "@/constants/app.constants";
import { Tree } from "@/types/api.types";

interface TreeCardProps {
  tree: Tree;
  onShare?: (tree: Tree) => void;
  onDelete?: (tree: Tree) => void;
  deletePending?: boolean;
}

function roleBadge(role?: string) {
  if (!role || role === "OWNER") return null;
  return (
    <Badge variant={role === "EDIT" ? "warning" : "default"}>
      {role === "EDIT" ? "Editor" : "Viewer"}
    </Badge>
  );
}

export function TreeCard({
  tree,
  onShare,
  onDelete,
  deletePending,
}: TreeCardProps) {
  const isOwner = !tree.role || tree.role === "OWNER";
  const counts = tree.counts ?? { men: 0, women: 0, total: 0 };
  const hasOwnerActions = isOwner && (onShare || onDelete);
  const description = tree.description?.trim();

  return (
    <Card
      hover
      padding="md"
      className="group flex h-full flex-col transition-colors hover:border-brand-200"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
          <TreePine className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-left text-base font-semibold leading-snug text-text-primary">
              {tree.name}
            </h3>
            {roleBadge(tree.role)}
          </div>
          <p
            className={`mt-1 line-clamp-2 min-h-10 break-words text-left text-sm leading-relaxed ${
              description ? "text-text-secondary" : "italic text-text-muted"
            }`}
            title={description || undefined}
          >
            {description || "-"}
          </p>
          {tree.sharedByEmail && (
            <p className="mt-1 text-left text-xs text-text-muted">
              Shared by {tree.sharedByEmail}
            </p>
          )}
        </div>
      </div>

      <MemberStatsBar counts={counts} className="mt-3" />

      <div className="mt-auto flex gap-2 pt-4">
        <Link to={ROUTES.TREE(tree.id)} className="min-w-0 flex-1">
          <Button variant="primary" className="h-10 w-full gap-2">
            Open
            <ArrowRight
              className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Button>
        </Link>
        {hasOwnerActions && (
          <>
            {onShare && (
              <Button
                type="button"
                variant="secondary"
                title="Share tree"
                aria-label={`Share ${tree.name}`}
                onClick={() => onShare(tree)}
                className="h-10 shrink-0 gap-1.5 px-3"
              >
                <Share2 className="size-4 shrink-0" aria-hidden="true" />
                Share
              </Button>
            )}
            {onDelete && (
              <Button
                type="button"
                variant="secondary"
                title="Delete tree"
                loading={deletePending}
                aria-label={`Delete ${tree.name}`}
                onClick={() => onDelete(tree)}
                className="h-10 shrink-0 gap-1.5 px-3 text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="size-4 shrink-0" aria-hidden="true" />
                Delete
              </Button>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

export function TreeCardSkeleton() {
  return (
    <Card padding="md" className="flex h-full flex-col">
      <div className="flex items-start gap-3">
        <Skeleton className="size-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
      <Skeleton className="mt-3 h-10 w-full rounded-lg" />
      <div className="mt-auto flex gap-2 pt-4">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 w-20 rounded-xl" />
        <Skeleton className="h-10 w-20 rounded-xl" />
      </div>
    </Card>
  );
}
