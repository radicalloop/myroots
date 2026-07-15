import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'rounded-xl bg-gradient-to-r from-border-subtle via-white to-border-subtle bg-[length:200%_100%] animate-shimmer',
        className,
      )}
      aria-hidden="true"
    />
  );
}
