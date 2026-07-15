import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  Link2,
  MessageCircle,
  Share2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  useTreeShares,
  useCreateTreeShare,
  useUpdateTreeShare,
  useDeleteTreeShare,
  useTreeView,
} from "@/hooks/api/useFamilyTree";
import { ROUTES } from "@/constants/app.constants";
import { TreePersonNode } from "@/types/api.types";
import { shareTreeSnapshot } from "@/utils/share-tree-snapshot";
import { SharePermissionSelect } from "@/components/SharePermissionSelect";

interface ShareModalProps {
  treeId: string;
  treeName: string;
  isOwner: boolean;
  open: boolean;
  onClose: () => void;
}

const urlBase = window.location.origin;

function getShareUrl(token: string): string {
  return `${urlBase}/accept-share/${token}`;
}

function getPublicTreeUrl(treeId: string): string {
  return `${urlBase}${ROUTES.PUBLIC_TREE(treeId)}`;
}

function countRelatives(root: TreePersonNode | null | undefined): number {
  const visited = new Set<string>();

  const visit = (person: TreePersonNode | null | undefined) => {
    if (!person || visited.has(person.id)) return;
    visited.add(person.id);
    visit(person.spouse);
    person.children.forEach(visit);
  };

  visit(root);
  return visited.size;
}

function statusVariant(status: string): "success" | "warning" | "default" {
  if (status === "ACCEPTED") return "success";
  if (status === "PENDING") return "warning";
  return "default";
}

export function ShareModal({
  treeId,
  treeName,
  isOwner,
  open,
  onClose,
}: ShareModalProps) {
  const { data: shares, isLoading } = useTreeShares(treeId);
  const { data: treeView, isLoading: isTreeLoading } = useTreeView(treeId, {
    enabled: open && isOwner,
  });
  const createShare = useCreateTreeShare(treeId);
  const updateShare = useUpdateTreeShare(treeId);
  const deleteShare = useDeleteTreeShare(treeId);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"VIEW" | "EDIT">("VIEW");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [publicLinkCopied, setPublicLinkCopied] = useState(false);
  const [isSharingSnapshot, setIsSharingSnapshot] = useState(false);
  const publicTreeUrl = useMemo(() => getPublicTreeUrl(treeId), [treeId]);
  const relativesCount = useMemo(
    () => countRelatives(treeView?.root),
    [treeView?.root],
  );

  const handleInvite = () => {
    if (!email.trim()) return;
    createShare.mutate(
      { sharedWithEmail: email.trim(), permission },
      { onSuccess: () => setEmail("") },
    );
  };

  const handleCopyLink = (token: string) => {
    void navigator.clipboard.writeText(getShareUrl(token));
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleCopyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(publicTreeUrl);
      setPublicLinkCopied(true);
      toast.success("View-only link copied");
      setTimeout(() => setPublicLinkCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleShareSnapshot = async () => {
    if (!treeView && isTreeLoading) return;

    try {
      setIsSharingSnapshot(true);
      const mode = await shareTreeSnapshot({
        treeName,
        relativesCount,
        shareUrl: publicTreeUrl,
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Share "${treeName}"`}
      size="md"
      footer={null}
    >
      <div className="space-y-4">
        {isOwner && (
          <div className="space-y-4">
            <div className="space-y-3 rounded-xl border border-border-soft p-4">
              <div>
                <h4 className="text-sm font-semibold text-text-primary">
                  Share without email
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">
                  Anyone with this link can view only.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="min-w-0 justify-center gap-2 whitespace-nowrap px-3"
                  onClick={handleCopyPublicLink}
                >
                  {publicLinkCopied ? (
                    <Check
                      className="h-4 w-4 text-green-600"
                      aria-hidden="true"
                    />
                  ) : (
                    <Link2 className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span className="truncate">
                    {publicLinkCopied ? "Copied" : "View-only link"}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="min-w-0 justify-center gap-2 whitespace-nowrap px-3"
                  onClick={handleShareSnapshot}
                  loading={isSharingSnapshot || isTreeLoading}
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  <span className="truncate">WhatsApp</span>
                </Button>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border-soft p-4">
              <div>
                <Input
                  label="Email address"
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleInvite();
                  }}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Permission
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={permission === "VIEW" ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => setPermission("VIEW")}
                  >
                    Can view
                  </Button>
                  <Button
                    type="button"
                    variant={permission === "EDIT" ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => setPermission("EDIT")}
                  >
                    Can edit
                  </Button>
                </div>
              </div>
              <Button
                className="w-full gap-2"
                onClick={handleInvite}
                loading={createShare.isPending}
                disabled={!email.trim()}
              >
                <Share2 className="h-4 w-4" />
                Send invite
              </Button>
              <p className="text-xs leading-relaxed text-text-muted">
                The tree appears in their dashboard only after they accept the
                email invite.
              </p>
            </div>
          </div>
        )}

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Shared with
          </h4>
          {isLoading && (
            <p className="text-sm text-text-secondary">Loading...</p>
          )}
          {!isLoading && (!shares || shares.length === 0) && (
            <p className="text-sm text-text-secondary">No shares yet</p>
          )}
          {shares?.map((share) => (
            <div
              key={share.id}
              className="flex min-w-0 items-center gap-2 rounded-lg py-2.5 hover:bg-bg-muted"
            >
              <div className="min-w-0 flex-1 overflow-hidden">
                <Tooltip content={share.sharedWithEmail} mobileOnly>
                  <p className="text-sm font-medium text-text-primary max-sm:truncate">
                    {share.sharedWithEmail}
                  </p>
                </Tooltip>
                <div className="mt-1 flex items-center gap-1.5">
                  <Badge variant={statusVariant(share.status)}>
                    {share.status}
                  </Badge>
                  <span className="text-xs text-text-muted">
                    {share.permission === "EDIT" ? "Editor" : "Viewer"}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {share.status === "PENDING" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label="Copy share link"
                    onClick={() => handleCopyLink(share.token)}
                    className="px-2"
                  >
                    {copiedToken === share.token ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
                {isOwner && (
                  <>
                    <SharePermissionSelect
                      value={share.permission}
                      onChange={(permission) =>
                        updateShare.mutate({
                          shareId: share.id,
                          data: { permission },
                        })
                      }
                      disabled={updateShare.isPending}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label="Remove share"
                      onClick={() => deleteShare.mutate(share.id)}
                      loading={deleteShare.isPending}
                      className="px-2 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
