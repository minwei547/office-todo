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
  sm: "h-7 px-3 text-[12px] gap-1",
  md: "h-9 px-4 text-[13px] gap-1.5",
  lg: "h-11 px-5 text-[14px] gap-2",
};

const variantClass: Record<Variant, string> = {
  // 薄荷渐变主按钮
  primary:
    "bg-mint-gradient text-[#2a5a4a] border border-transparent hover:shadow-glow hover:-translate-y-px active:translate-y-0",
  // 白底次按钮
  secondary:
    "bg-surface text-ink border border-line hover:bg-bg-soft hover:border-mint active:translate-y-px",
  // 幽灵按钮
  ghost:
    "bg-transparent text-muted border border-transparent hover:bg-bg-soft hover:text-ink",
  // 蜜桃危险
  danger:
    "bg-peach-soft text-[#a85c4a] border border-peach hover:bg-peach hover:text-[#5a3a2a]",
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
          "inline-flex items-center justify-center font-semibold rounded-full transition-all duration-150 focus-ring select-none",
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
        "inline-flex items-center justify-center rounded-full border border-transparent transition-colors focus-ring",
        size === "sm" ? "h-7 w-7" : "h-9 w-9",
        tone === "neutral"
          ? "text-muted hover:bg-bg-soft hover:text-ink border-line bg-surface shadow-sm"
          : "text-[#4a7a68] hover:bg-mint-soft border-mint bg-mint-soft",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
