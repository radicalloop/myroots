import clsx from "clsx";
import { Eye, EyeOff } from "lucide-react";
import { InputHTMLAttributes, useState } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({
  label,
  error,
  hint,
  className,
  id,
  type,
  required,
  disabled,
  readOnly,
  ...props
}: InputProps) {
  const inputId = id ?? props.name;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const isDate = type === "date";
  const inputType = isPassword && showPassword ? "text" : type;
  const isInactive = disabled || readOnly;

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className={clsx(
            "block text-sm font-medium",
            isInactive ? "text-text-secondary" : "text-text-primary",
          )}
        >
          {label}
          {required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type={inputType}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          aria-readonly={readOnly || undefined}
          className={clsx(
            "w-full rounded-[var(--radius-input)] border px-3.5 py-2.5 text-sm",
            "placeholder:text-text-muted transition-all duration-200 outline-none",
            isPassword && "pr-11",
            isDate && "input-date",
            isInactive
              ? [
                  "border-border-soft bg-warm-100 text-text-muted",
                  "shadow-none",
                  "hover:border-border-soft",
                  "focus:border-border-soft focus:ring-0",
                ]
              : [
                  "bg-white text-text-primary",
                  "focus:border-brand-400 focus:ring-[3px] focus:ring-brand-500/15",
                  error
                    ? "border-red-300 focus:border-red-400 focus:ring-red-500/15"
                    : "border-border-soft hover:border-warm-300",
                ],
            disabled && "cursor-not-allowed opacity-75",
            readOnly && !disabled && "cursor-default",
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-text-muted transition-colors duration-150 hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-text-muted">{hint}</p>
      )}
    </div>
  );
}
