import { Users } from "lucide-react";
import clsx from "clsx";

export interface MemberCounts {
  men: number;
  women: number;
  total: number;
}

interface MemberStatsBarProps {
  counts: MemberCounts;
  className?: string;
}

export function MemberStatsBar({ counts, className }: MemberStatsBarProps) {
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
