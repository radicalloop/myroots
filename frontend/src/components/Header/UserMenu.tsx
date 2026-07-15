import { LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, getDisplayNameFromEmail, getInitialsFromEmail } from "@/lib/utils";
import { User } from "@/types/api.types";

interface UserMenuProps {
  user: User;
  onLogout: () => void;
}

function UserAvatar({
  email,
  size = "sm",
  className,
}: {
  email: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const initials = getInitialsFromEmail(email);
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
  const displayName = getDisplayNameFromEmail(user.email);

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
          <UserAvatar email={user.email} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[16rem] p-1.5">
        <div className="flex items-center gap-3 rounded-xl bg-warm-50/50 px-3 py-3">
          <UserAvatar email={user.email} size="md" />
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
