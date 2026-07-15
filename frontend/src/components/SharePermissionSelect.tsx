import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type SharePermission = "VIEW" | "EDIT";

const PERMISSION_OPTIONS: { value: SharePermission; label: string }[] = [
  { value: "VIEW", label: "View" },
  { value: "EDIT", label: "Edit" },
];

interface SharePermissionSelectProps {
  value: SharePermission;
  onChange: (value: SharePermission) => void;
  disabled?: boolean;
}

export function SharePermissionSelect({
  value,
  onChange,
  disabled = false,
}: SharePermissionSelectProps) {
  const selectedLabel =
    PERMISSION_OPTIONS.find((option) => option.value === value)?.label ?? "View";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          disabled={disabled}
          aria-label="Change permission"
          className="inline-flex h-8 min-w-[4.75rem] items-center justify-between gap-1 rounded-md border border-border-soft bg-bg-elevated px-2.5 text-xs font-medium text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25 disabled:opacity-60"
        >
          <span>{selectedLabel}</span>
          <ChevronDown
            className="h-3.5 w-3.5 shrink-0 text-text-muted"
            aria-hidden="true"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={4}
        className="min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-hidden rounded-md border border-border-soft p-0 shadow-md"
      >
        {PERMISSION_OPTIONS.map((option) => {
          const isSelected = value === option.value;

          return (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => onChange(option.value)}
              className={cn(
                "justify-center rounded-none px-3 py-2.5 text-xs font-medium",
                isSelected
                  ? "bg-brand-600 text-white focus:bg-brand-600 focus:text-white"
                  : "bg-white text-text-primary focus:bg-warm-50",
              )}
            >
              {option.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
