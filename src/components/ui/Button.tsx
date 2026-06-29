import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

const sizeClass: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[12px] gap-1",
  md: "h-9 px-3.5 text-[13px] gap-1.5",
  lg: "h-11 px-5 text-[14px] gap-2",
};

const variantClass: Record<Variant, string> = {
  primary:
    "bg-blue-600 text-white border border-blue-600 hover:bg-blue-600/90 hover:shadow-paper active:translate-y-px",
  secondary:
    "bg-slate-50 text-slate-900 border border-slate-300/25 hover:border-slate-300/50 hover:bg-chip/60 active:translate-y-px",
  ghost:
    "bg-transparent text-slate-900/80 border border-transparent hover:bg-ink/5 hover:text-slate-900",
  danger:
    "bg-transparent text-blue-600 border border-blue-600/40 hover:bg-blue-50 hover:border-blue-600",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "secondary", size = "md", leadingIcon, trailingIcon, className, children, ...rest },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus-ring select-none",
          sizeClass[size],
          variantClass[variant],
          className,
        )}
        {...rest}
      >
        {leadingIcon ? <span className="shrink-0">{leadingIcon}</span> : null}
        {children}
        {trailingIcon ? <span className="shrink-0">{trailingIcon}</span> : null}
      </button>
    );
  },
);
Button.displayName = "Button";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md";
  tone?: "neutral" | "accent";
}

export function IconButton({
  size = "md",
  tone = "neutral",
  className,
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg border border-transparent transition-colors focus-ring",
        size === "sm" ? "h-7 w-7" : "h-9 w-9",
        tone === "neutral"
          ? "text-slate-900/70 hover:bg-ink/5 hover:text-slate-900"
          : "text-blue-600 hover:bg-blue-50",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
