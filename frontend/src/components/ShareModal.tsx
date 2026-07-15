import { useState } from 'react';
import { Share2, Trash2, Copy, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  useTreeShares,
  useCreateTreeShare,
  useUpdateTreeShare,
  useDeleteTreeShare,
} from '@/hooks/api/useFamilyTree';

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

function statusVariant(status: string): 'success' | 'warning' | 'default' {
  if (status === 'ACCEPTED') return 'success';
  if (status === 'PENDING') return 'warning';
  return 'default';
}

export function ShareModal({ treeId, treeName, isOwner, open, onClose }: ShareModalProps) {
  const { data: shares, isLoading } = useTreeShares(treeId);
  const createShare = useCreateTreeShare(treeId);
  const updateShare = useUpdateTreeShare(treeId);
  const deleteShare = useDeleteTreeShare(treeId);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'VIEW' | 'EDIT'>('VIEW');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleInvite = () => {
    if (!email.trim()) return;
    createShare.mutate(
      { sharedWithEmail: email.trim(), permission },
      { onSuccess: () => setEmail('') },
    );
  };

  const handleCopyLink = (token: string) => {
    void navigator.clipboard.writeText(getShareUrl(token));
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
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
          <div className="space-y-3 rounded-xl border border-border-soft p-4">
            <div>
              <Input
                label="Email address"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInvite();
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
                  variant={permission === 'VIEW' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setPermission('VIEW')}
                >
                  Can view
                </Button>
                <Button
                  type="button"
                  variant={permission === 'EDIT' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setPermission('EDIT')}
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
              className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-bg-muted"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">
                  {share.sharedWithEmail}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <Badge variant={statusVariant(share.status)}>
                    {share.status}
                  </Badge>
                  <span className="text-xs text-text-muted">
                    {share.permission === 'EDIT' ? 'Editor' : 'Viewer'}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                {share.status === 'PENDING' && (
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
                    <select
                      value={share.permission}
                      onChange={(e) =>
                        updateShare.mutate({
                          shareId: share.id,
                          data: { permission: e.target.value as 'VIEW' | 'EDIT' },
                        })
                      }
                      className="h-8 rounded-md border border-border-soft bg-bg-elevated px-2 text-xs text-text-primary"
                    >
                      <option value="VIEW">View</option>
                      <option value="EDIT">Edit</option>
                    </select>
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
