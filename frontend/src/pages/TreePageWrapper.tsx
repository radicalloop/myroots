import { TreePage } from './TreePage';
import { PublicTreePage } from './PublicTreePage';
import { useAuth } from '@/providers/AuthProvider';

export function TreePageWrapper() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <TreePage />;
  }

  return <PublicTreePage />;
}
