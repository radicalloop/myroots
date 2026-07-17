import { Users } from "lucide-react";
import clsx from "clsx";
import type { TreeMemberCounts } from "@/utils/tree.utils";

export type MemberCounts = TreeMemberCounts;

interface MemberStatsBarProps {
  counts: MemberCounts;
  variant?: "default" | "compact";
  className?: string;
}

export function MemberStatsBar({
  counts,
  variant = "default",
  className,
}: MemberStatsBarProps) {
  if (variant === "compact") {
    return (
      <div
        className={clsx(
          "flex items-center gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          className,
        )}
      >
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-100">
          <Users className="size-3 shrink-0" aria-hidden="true" />
          {counts.total} {counts.total === 1 ? "member" : "members"}
        </span>
        <span className="inline-flex shrink-0 rounded-full bg-warm-100 px-2.5 py-1 text-[11px] font-medium text-text-secondary">
          {counts.men} men
        </span>
        <span className="inline-flex shrink-0 rounded-full bg-warm-100 px-2.5 py-1 text-[11px] font-medium text-text-secondary">
          {counts.women} women
        </span>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-lg bg-warm-50 p-2 text-xs text-text-secondary",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5 font-medium text-text-primary">
        <Users className="size-4 shrink-0 text-brand-600" aria-hidden="true" />
        {counts.total} {counts.total === 1 ? "member" : "members"}
      </span>
      <span className="text-text-muted" aria-hidden="true">
        ·
      </span>
      <span>{counts.men} men</span>
      <span className="text-text-muted" aria-hidden="true">
        ·
      </span>
      <span>{counts.women} women</span>
    </div>
  );
}
