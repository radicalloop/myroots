import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/providers/AuthProvider';
import { ProtectedRoute, AppLayout } from '@/layouts/AppLayout';
import { TreeWorkspaceLayout } from '@/layouts/TreeWorkspaceLayout';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { TreePageWrapper } from '@/pages/TreePageWrapper';
import { AcceptInvitePage } from '@/pages/AcceptInvitePage';
import { ROUTES } from '@/constants/app.constants';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
            <Route path={ROUTES.SIGNUP} element={<SignupPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
              </Route>
              <Route path="/accept-share/:token" element={<AcceptInvitePage />} />
            </Route>
            <Route element={<TreeWorkspaceLayout />}>
              <Route path="/tree/:treeId" element={<TreePageWrapper />} />
            </Route>
            <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            classNames: {
              toast: 'rounded-xl border border-border-soft shadow-[var(--shadow-card-hover)] font-sans',
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
