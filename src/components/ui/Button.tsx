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
    "bg-accent-gradient text-white border border-accent/40 hover:shadow-glow active:translate-y-px",
  secondary:
    "bg-white/[0.04] text-ink border border-white/[0.10] hover:bg-white/[0.08] hover:border-white/[0.18] active:translate-y-px",
  ghost:
    "bg-transparent text-ink/80 border border-transparent hover:bg-white/[0.06] hover:text-ink",
  danger:
    "bg-transparent text-danger border border-danger/40 hover:bg-danger/10 hover:border-danger",
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
          ? "text-ink/70 hover:bg-white/[0.06] hover:text-ink"
          : "text-accent-soft hover:bg-accent/10",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
