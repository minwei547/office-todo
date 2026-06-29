import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChipProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  leadingDot?: string; // 标签前色点
}

// 标签 chip：可点击筛选用；非 onClick 时仅展示
export function Chip({
  children,
  active = false,
  onClick,
  className,
  leadingDot,
}: ChipProps) {
  const interactive = typeof onClick === "function";
  const Tag = interactive ? "button" : "span";
  return (
    <Tag
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 h-6 px-2 text-[11px] font-medium border rounded-lg transition-colors",
        interactive && "cursor-pointer focus-ring",
        active
          ? "bg-accent/15 text-accent-soft border-accent/40"
          : "bg-white/[0.04] text-ink/70 border-white/[0.08] hover:border-white/[0.18] hover:text-ink",
        className,
      )}
    >
      {leadingDot ? (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: leadingDot }}
        />
      ) : null}
      {children}
    </Tag>
  );
}
