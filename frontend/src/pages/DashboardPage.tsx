import { useState, useMemo } from "react";
import { Plus, TreePine } from "lucide-react";
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
import { EmptyState } from "@/components/ui/EmptyState";
import { ShareModal } from "@/components/ShareModal";
import {
  TreeCard,
  TreeCardSkeleton,
} from "@/components/Dashboard/TreeCard";
import { DashboardSection } from "@/components/Dashboard/DashboardSection";
import { Tree } from "@/types/api.types";

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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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

      {ownedTrees.length > 0 && (
        <DashboardSection title="My trees" count={ownedTrees.length}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
        </DashboardSection>
      )}

      {sharedTrees.length > 0 && (
        <DashboardSection title="Shared with me" count={sharedTrees.length}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sharedTrees.map((tree) => (
              <TreeCard key={tree.id} tree={tree} />
            ))}
          </div>
        </DashboardSection>
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
