import { useEffect, type ReactNode } from "react";
import clsx from "clsx";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  bodyClassName?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-[420px]",
};

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="rounded-xl p-2 text-text-muted transition-all duration-150 hover:bg-warm-50 hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  header,
  children,
  footer,
  size = "md",
  bodyClassName,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <button
        type="button"
        className="absolute inset-0 animate-fade-in bg-text-primary/40 backdrop-blur-sm"
        aria-label="Close modal"
        onClick={onClose}
      />

      <div
        className={clsx(
          "relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden bg-white shadow-[var(--shadow-modal)]",
          "animate-scale-in rounded-t-[var(--radius-card)] sm:max-h-[min(88vh,724px)] sm:rounded-[var(--radius-card)]",
          sizeClasses[size],
        )}
      >
        {header ? (
          <div className="relative shrink-0 border-b border-border-subtle bg-white/95 backdrop-blur-md">
            {header}
          </div>
        ) : (
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border-subtle bg-gradient-to-b from-warm-50/70 to-white px-6 py-5 backdrop-blur-md">
            <div className="min-w-0">
              {title && (
                <h3
                  id="modal-title"
                  className="font-serif text-xl font-normal tracking-tight text-text-primary"
                >
                  {title}
                </h3>
              )}
              {description && (
                <p className="mt-1 text-sm text-text-secondary">
                  {description}
                </p>
              )}
            </div>
            <CloseButton onClose={onClose} />
          </div>
        )}

        <div
          className={clsx(
            "min-h-0 flex-1 overflow-y-auto custom-scrollbar",
            bodyClassName ?? "px-6 py-5",
          )}
        >
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-border-subtle bg-white/95 px-6 py-4 backdrop-blur-md">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ModalCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute right-0 top-0 z-10">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="rounded-full bg-white/90 p-1.5 text-text-muted shadow-sm backdrop-blur transition-all duration-150 hover:bg-white hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
