import clsx from "clsx";
import { ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variants = {
  primary:
    "bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-sm hover:from-brand-600 hover:to-brand-700 hover:shadow-md active:scale-[0.98] focus-visible:ring-brand-500/30",
  secondary:
    "border border-border-soft bg-white text-text-primary shadow-sm hover:bg-warm-50 hover:border-warm-200 active:scale-[0.98] focus-visible:ring-brand-500/20",
  danger:
    "bg-gradient-to-b from-red-500 to-red-600 text-white shadow-sm hover:from-red-600 hover:to-red-700 hover:shadow-md active:scale-[0.98] focus-visible:ring-red-500/30",
  ghost:
    "bg-transparent text-text-secondary hover:bg-warm-50 hover:text-text-primary active:scale-[0.98]",
};

const sizes = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-8 md:h-10 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-[6px] md:rounded-xl font-medium transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <Spinner
          size="sm"
          className={
            variant === "primary" || variant === "danger" ? "text-white" : ""
          }
        />
      ) : (
        children
      )}
    </button>
  );
}
