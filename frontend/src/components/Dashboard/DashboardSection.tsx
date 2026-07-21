import { type ReactNode } from "react";

interface DashboardSectionProps {
  title: string;
  count?: number;
  children: ReactNode;
}

export function DashboardSection({
  title,
  count,
  children,
}: DashboardSectionProps) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted md:text-sm">
          {title}
        </h3>
        {count !== undefined && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warm-100 px-1.5 text-[10px] font-semibold tabular-nums text-text-secondary">
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
