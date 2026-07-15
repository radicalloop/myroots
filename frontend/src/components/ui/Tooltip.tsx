import clsx from 'clsx';
import { type ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  className?: string;
  mobileOnly?: boolean;
}

export function Tooltip({
  content,
  children,
  className,
  mobileOnly = false,
}: TooltipProps) {
  return (
    <span
      className={clsx(
        'group/tooltip relative block min-w-0 max-w-full outline-none',
        className,
      )}
      tabIndex={0}
    >
      {children}
      <span
        role="tooltip"
        className={clsx(
          'pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 max-w-[min(100vw-2rem,20rem)]',
          'rounded-md bg-text-primary px-2.5 py-1.5 text-xs leading-snug text-white shadow-md',
          'invisible opacity-0 transition-opacity duration-150',
          'group-hover/tooltip:visible group-hover/tooltip:opacity-100',
          'group-focus-visible/tooltip:visible group-focus-visible/tooltip:opacity-100',
          mobileOnly && 'sm:hidden',
        )}
      >
        {content}
      </span>
    </span>
  );
}
