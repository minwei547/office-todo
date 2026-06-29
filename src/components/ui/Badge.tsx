import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Priority, TaskStatus } from "@/types";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/types";

// 徽章：深色玻璃风
const STATUS_STYLE: Record<TaskStatus, string> = {
  todo: "bg-white/[0.05] text-ink/70 border-white/[0.10]",
  in_progress: "bg-accent/15 text-accent-soft border-accent/40",
  done: "bg-success/15 text-success border-success/40 line-through decoration-success/40",
};

const PRIORITY_STYLE: Record<Priority, string> = {
  low: "bg-white/[0.04] text-muted border-white/[0.08]",
  medium: "bg-white/[0.06] text-ink/80 border-white/[0.14]",
  high: "bg-violet/15 text-violet-soft border-violet/40",
  urgent: "bg-danger/20 text-danger border-danger/50",
};

const PRIORITY_DOT: Record<Priority, string> = {
  low: "bg-muted",
  medium: "bg-ink/60",
  high: "bg-violet-soft",
  urgent: "bg-danger",
};

export function StatusBadge({
  status,
  className,
}: {
  status: TaskStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 h-5 px-2 text-[11px] font-medium uppercase tracking-wide border rounded-lg",
        STATUS_STYLE[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PriorityBadge({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 h-5 px-2 text-[11px] font-medium uppercase tracking-wide border rounded-lg",
        PRIORITY_STYLE[priority],
        className,
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[priority])}
      />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

// 通用计数徽章
export function CountBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "danger";
  className?: string;
}) {
  const toneClass = {
    neutral: "bg-white/[0.05] text-ink/70 border-white/[0.10]",
    accent: "bg-accent/15 text-accent-soft border-accent/40",
    success: "bg-success/15 text-success border-success/40",
    danger: "bg-danger text-white border-danger",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 text-[11px] font-mono font-medium border rounded-lg",
        toneClass,
        className,
      )}
    >
      {children}
    </span>
  );
}
