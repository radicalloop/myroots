import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, TreePine, Trash2, ArrowRight, Share2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useTrees,
  useCreateTree,
  useDeleteTree,
} from "@/hooks/api/useFamilyTree";
import {
  treeSchema,
  TreeFormValues,
} from "@/validations/family-tree.validation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ShareModal } from "@/components/ShareModal";
import { ROUTES } from "@/constants/app.constants";
import { Tree } from "@/types/api.types";

function TreeCardSkeleton() {
  return (
    <Card padding="md">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="mt-3 h-4 w-full" />
      <div className="mt-5 flex gap-2">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-20" />
      </div>
    </Card>
  );
}

function roleBadge(role?: string) {
  if (!role || role === "OWNER") return null;
  return (
    <Badge variant={role === "EDIT" ? "warning" : "default"}>
      {role === "EDIT" ? "Editor" : "Viewer"}
    </Badge>
  );
}

function TreeCard({
  tree,
  onShare,
  onDelete,
  deletePending,
}: {
  tree: Tree;
  onShare?: (tree: Tree) => void;
  onDelete?: (tree: Tree) => void;
  deletePending?: boolean;
}) {
  const isOwner = !tree.role || tree.role === "OWNER";
  const counts = tree.counts ?? { men: 0, women: 0, total: 0 };

  return (
    <Card hover padding="md" className="group flex flex-col">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
          <TreePine className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-text-primary">
              {tree.name}
            </h3>
            {roleBadge(tree.role)}
          </div>
          {tree.description ? (
            <p className="-m-0.5 line-clamp-2 text-sm leading-relaxed text-text-secondary">
              {tree.description}
            </p>
          ) : null}
          {tree.sharedByEmail && (
            <p className="mt-1 text-xs text-text-muted">
              Shared by {tree.sharedByEmail}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs font-medium text-text-secondary">
            {[
              { label: "Men", value: counts.men },
              { label: "Women", value: counts.women },
              { label: "Total", value: counts.total },
            ].map((item) => (
              <span
                key={item.label}
                className="inline-flex h-7 items-center rounded-full border border-brand-100 bg-brand-50/80 px-2.5 text-brand-800"
              >
                {item.label}: {item.value}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <Link to={ROUTES.TREE(tree.id)} className="flex-1">
          <Button variant="primary" className="w-full gap-2">
            Open
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </Link>
        {isOwner && (
          <>
            {onShare && (
              <Button
                variant="secondary"
                size="md"
                aria-label={`Share ${tree.name}`}
                onClick={() => onShare(tree)}
                className="px-3"
              >
                <Share2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="secondary"
                size="md"
                loading={deletePending}
                onClick={() => onDelete(tree)}
                aria-label={`Delete ${tree.name}`}
                className="px-3 text-red-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const { data: trees, isLoading } = useTrees();
  const createTreeMutation = useCreateTree();
  const deleteTreeMutation = useDeleteTree();
  const [showForm, setShowForm] = useState(false);
  const [treePendingDelete, setTreePendingDelete] = useState<Tree | null>(null);
  const [shareTarget, setShareTarget] = useState<Tree | null>(null);

  const { ownedTrees, sharedTrees } = useMemo(() => {
    if (!trees) return { ownedTrees: [], sharedTrees: [] };
    return {
      ownedTrees: trees.filter((t) => !t.role || t.role === "OWNER"),
      sharedTrees: trees.filter((t) => t.role && t.role !== "OWNER"),
    };
  }, [trees]);

  const treeCount = trees?.length ?? 0;
  const hasTrees = !isLoading && treeCount > 0;
  const showEmptyState = !isLoading && treeCount === 0 && !showForm;
  const showNewTreeButton = hasTrees && !showForm;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TreeFormValues>({
    resolver: zodResolver(treeSchema),
  });

  const onCreate = (values: TreeFormValues) => {
    createTreeMutation.mutate(values, {
      onSuccess: () => {
        reset();
        setShowForm(false);
      },
    });
  };

  const onConfirmDelete = () => {
    if (!treePendingDelete) return;
    deleteTreeMutation.mutate(treePendingDelete.id, {
      onSuccess: () => setTreePendingDelete(null),
    });
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-text-primary">
            Your family trees
          </h2>
          <p className="mt-1.5 text-sm text-text-secondary">
            Create, manage, and explore your family heritage
          </p>
        </div>
        {showNewTreeButton && (
          <Button
            onClick={() => setShowForm(true)}
            className="gap-2 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New tree
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="animate-slide-up" padding="lg">
          <h3 className="text-base font-semibold text-text-primary">
            Create a new tree
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            Give your family tree a meaningful name
          </p>
          <form onSubmit={handleSubmit(onCreate)} className="mt-5 space-y-4">
            <Input
              label="Tree name"
              placeholder="e.g. The Smith Family"
              {...register("name")}
              error={errors.name?.message}
              required
            />
            <Input
              label="Description"
              placeholder="Optional description"
              {...register("description")}
            />
            <div className="flex gap-3 pt-1">
              <Button type="submit" loading={createTreeMutation.isPending}>
                Create tree
              </Button>
              {hasTrees && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowForm(false);
                    reset();
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>
      )}

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <TreeCardSkeleton key={i} />
          ))}
        </div>
      )}

      {showEmptyState && (
        <Card padding="none">
          <EmptyState
            icon={<TreePine className="h-8 w-8" />}
            title="No family trees yet"
            description="Create your first family tree to start mapping your heritage."
            action={{
              label: "Create your first tree",
              onClick: () => setShowForm(true),
            }}
          />
        </Card>
      )}

      {/* My Trees */}
      {ownedTrees.length > 0 && (
        <section>
          <h3 className="mb-2 md:mb-4 text-xs md:text-sm font-semibold uppercase tracking-wide text-text-muted">
            My trees
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ownedTrees.map((tree) => (
              <TreeCard
                key={tree.id}
                tree={tree}
                onShare={setShareTarget}
                onDelete={setTreePendingDelete}
                deletePending={
                  deleteTreeMutation.isPending &&
                  treePendingDelete?.id === tree.id
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* Shared With Me */}
      {sharedTrees.length > 0 && (
        <section>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">
            Shared with me
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sharedTrees.map((tree) => (
              <TreeCard key={tree.id} tree={tree} />
            ))}
          </div>
        </section>
      )}

      {/* Delete confirmation */}
      <Modal
        open={treePendingDelete !== null}
        onClose={() => {
          if (!deleteTreeMutation.isPending) setTreePendingDelete(null);
        }}
        title="Delete tree?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setTreePendingDelete(null)}
              disabled={deleteTreeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={onConfirmDelete}
              loading={deleteTreeMutation.isPending}
            >
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-text-secondary">
          This will permanently delete "{treePendingDelete?.name}" and cannot be
          undone.
        </p>
      </Modal>

      {/* Share modal */}
      {shareTarget && (
        <ShareModal
          treeId={shareTarget.id}
          treeName={shareTarget.name}
          isOwner={!shareTarget.role || shareTarget.role === "OWNER"}
          open
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  );
}
