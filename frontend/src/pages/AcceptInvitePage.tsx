import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAcceptShare } from '@/hooks/api/useFamilyTree';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { ROUTES } from '@/constants/app.constants';
import { CheckCircle, XCircle } from 'lucide-react';

export function AcceptInvitePage() {
  const { token = '' } = useParams<{ token: string }>();
  const acceptShare = useAcceptShare();

  useEffect(() => {
    if (token) {
      acceptShare.mutate(token);
    }
    // Accept only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <Card className="w-full max-w-md text-center" padding="lg">
        {acceptShare.isPending && (
          <div className="space-y-4">
            <Spinner size="lg" />
            <h2 className="text-lg font-semibold text-text-primary">
              Accepting invite...
            </h2>
            <p className="text-sm text-text-secondary">
              Please wait while we add this tree to your account.
            </p>
          </div>
        )}

        {acceptShare.isSuccess && (
          <div className="space-y-4">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="text-lg font-semibold text-text-primary">
              Tree added!
            </h2>
            <p className="text-sm text-text-secondary">
              Redirecting you to the tree...
            </p>
          </div>
        )}

        {acceptShare.isError && (
          <div className="space-y-4">
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="text-lg font-semibold text-text-primary">
              Invite not found
            </h2>
            <p className="text-sm text-text-secondary">
              This share link may have expired or already been accepted.
            </p>
            <Link to={ROUTES.DASHBOARD}>
              <Button variant="secondary">Go to dashboard</Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
