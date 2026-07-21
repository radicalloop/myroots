import { LogOut, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, getDisplayNameFromEmail, getInitialsFromEmail } from "@/lib/utils";
import { User } from "@/types/api.types";
import { ROUTES } from "@/constants/app.constants";

interface UserMenuProps {
  user: User;
  onLogout: () => void;
}

function UserAvatar({
  email,
  firstName,
  lastName,
  size = "sm",
  className,
}: {
  email: string;
  firstName?: string;
  lastName?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const initials =
    firstName || lastName
      ? `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase()
      : getInitialsFromEmail(email);
  const sizeClass = size === "md" ? "h-10 w-10 text-sm" : "h-9 w-9 text-xs";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 font-semibold text-brand-700 ring-2 ring-white",
        sizeClass,
        className,
      )}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const displayName = fullName || getDisplayNameFromEmail(user.email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="cursor-pointer">
        <button
          type="button"
          className={cn(
            "rounded-full outline-none transition-all duration-200",
            "hover:ring-2 hover:ring-brand-200 hover:ring-offset-2",
            "focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2",
            "data-[state=open]:ring-2 data-[state=open]:ring-brand-300 data-[state=open]:ring-offset-2",
          )}
          aria-label="Open user menu"
        >
          <UserAvatar
            email={user.email}
            firstName={user.firstName}
            lastName={user.lastName}
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[16rem] p-1.5">
        <div className="flex items-center gap-3 rounded-xl bg-warm-50/50 px-3 py-3">
          <UserAvatar
            email={user.email}
            firstName={user.firstName}
            lastName={user.lastName}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text-primary">
              {displayName}
            </p>
            <p className="truncate text-xs text-text-secondary">
              {user.email}
            </p>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className="mx-0.5 gap-2">
          <Link to={ROUTES.PROFILE}>
            <UserRound className="h-4 w-4" aria-hidden="true" />
            Profile
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={onLogout}
          className="mx-0.5 gap-2 text-red-600 focus:bg-red-50 focus:text-red-700"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
