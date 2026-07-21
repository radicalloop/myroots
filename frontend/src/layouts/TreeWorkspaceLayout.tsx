import { Link, Outlet, useLocation } from "react-router-dom";
import { Trees } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useLogout } from "@/hooks/useLogout";
import { useMe } from "@/hooks/api/useFamilyTree";
import { UserMenu } from "@/components/Header/UserMenu";
import { ROUTES } from "@/constants/app.constants";

export function TreeWorkspaceLayout() {
  const { user } = useAuth();
  const logout = useLogout();
  const location = useLocation();
  const isPublicTreeRoute = location.pathname.startsWith("/public/tree/");
  useMe({ enabled: !isPublicTreeRoute });

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--tree-canvas-bg)]">
      <header className="z-40 flex h-14 shrink-0 items-center justify-between border-b border-border-subtle/80 bg-white/70 px-4 backdrop-blur-xl sm:px-5">
        <Link
          to={ROUTES.DASHBOARD}
          className="group flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
            <Trees className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="font-serif text-base font-normal text-brand-800">
            MyRoots
          </span>
        </Link>
        {user && <UserMenu user={user} onLogout={logout} />}
      </header>
      <main className="min-h-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
