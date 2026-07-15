import { useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePublicTreeView } from '@/hooks/api/useFamilyTree';
import {
  FamilyTreeView,
  FamilyTreeViewHandle,
} from '@/components/TreeView/FamilyTreeView';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ROUTES } from '@/constants/app.constants';
import { TreePageToolbar } from './TreePageToolbar';
import { TreePublicProvider } from '@/contexts/TreePublicContext';

export function PublicTreePage() {
  const { treeId = '' } = useParams();
  const { data: treeView, isLoading, isError } = usePublicTreeView(treeId);
  const treeViewRef = useRef<FamilyTreeViewHandle>(null);

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
            isDownloadingPdf={false}
            canEdit={false}
            isSavingTreeName={false}
            onSaveTreeName={() => {}}
            onDownloadPdf={() => {}}
            onAddRoot={() => {}}
            onSearchSelect={() => {}}
            publicMode
          />
          <div className="min-h-0 min-w-0 flex-1 p-3 pt-36 sm:p-6 sm:pt-28">
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
