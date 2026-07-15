import { Link, Navigate, Outlet } from "react-router-dom";
import { Trees } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useLogout } from "@/hooks/useLogout";
import { useMe } from "@/hooks/api/useFamilyTree";
import { UserMenu } from "@/components/Header/UserMenu";
// import { ChatWidget } from "@/components/Chat/ChatWidget";
import { Spinner } from "@/components/ui/Spinner";
import { ROUTES } from "@/constants/app.constants";

export function ProtectedRoute() {
  const { isAuthenticated, clearAuth } = useAuth();
  const { isLoading, isError } = useMe();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface">
        <Spinner size="lg" />
        <p className="text-sm text-text-secondary">Loading your workspace...</p>
      </div>
    );
  }

  if (isError) {
    clearAuth();
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
}

export function AppLayout() {
  const { user } = useAuth();
  const logout = useLogout();

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link
            to={ROUTES.DASHBOARD}
            className="group flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
              <Trees className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            <span className="font-serif text-lg font-normal text-brand-800">
              MyRoots
            </span>
          </Link>
          {user && <UserMenu user={user} onLogout={logout} />}
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 sm:px-5">
        <Outlet />
      </main>
      {/* <ChatWidget /> */}
    </div>
  );
}
