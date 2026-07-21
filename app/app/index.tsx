import { Redirect } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function IndexRoute() {
  const { isHydrating, isAuthenticated } = useAuth();

  if (isHydrating) return <LoadingScreen message="Preparing MyRoots..." />;

  return <Redirect href={isAuthenticated ? '/dashboard' : '/login'} />;
}
