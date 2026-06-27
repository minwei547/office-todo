import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Priority, TaskStatus } from "@/types";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/types";

// 颜色调：方角徽章，呼应"档案感"
const STATUS_STYLE: Record<TaskStatus, string> = {
  todo: "bg-chip text-ink/70 border-ink/20",
  in_progress: "bg-accent/12 text-accent border-accent/30",
  done: "bg-success/15 text-success border-success/40 line-through decoration-success/40",
};

const PRIORITY_STYLE: Record<Priority, string> = {
  low: "bg-chip text-muted border-ink/15",
  medium: "bg-paper text-ink/70 border-ink/30",
  high: "bg-accent/10 text-accent border-accent/40",
  urgent: "bg-accent text-paper border-accent",
};

const PRIORITY_DOT: Record<Priority, string> = {
  low: "bg-muted",
  medium: "bg-ink/60",
  high: "bg-accent",
  urgent: "bg-paper",
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
        "inline-flex items-center gap-1.5 h-5 px-2 text-[11px] font-medium uppercase tracking-wide border rounded-[2px]",
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
        "inline-flex items-center gap-1.5 h-5 px-2 text-[11px] font-medium uppercase tracking-wide border rounded-[2px]",
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
    neutral: "bg-chip text-ink/70 border-ink/15",
    accent: "bg-accent/12 text-accent border-accent/30",
    success: "bg-success/15 text-success border-success/40",
    danger: "bg-accent text-paper border-accent",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 text-[11px] font-mono font-medium border rounded-[2px]",
        toneClass,
        className,
      )}
    >
      {children}
    </span>
  );
}
