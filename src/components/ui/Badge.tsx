import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Priority, TaskStatus } from "@/types";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/types";

// 颜色调：方角徽章，呼应"档案感"
const STATUS_STYLE: Record<TaskStatus, string> = {
  todo: "bg-chip text-slate-900/70 border-slate-300/20",
  in_progress: "bg-blue-600/12 text-blue-600 border-blue-600/30",
  done: "bg-success/15 text-success border-success/40 line-through decoration-success/40",
};

const PRIORITY_STYLE: Record<Priority, string> = {
  low: "bg-chip text-muted border-slate-300/15",
  medium: "bg-slate-50 text-slate-900/70 border-slate-300/30",
  high: "bg-blue-50 text-blue-600 border-blue-600/40",
  urgent: "bg-blue-600 text-white border-blue-600",
};

const PRIORITY_DOT: Record<Priority, string> = {
  low: "bg-muted",
  medium: "bg-ink/60",
  high: "bg-blue-600",
  urgent: "bg-slate-50",
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
    neutral: "bg-chip text-slate-900/70 border-slate-300/15",
    accent: "bg-blue-600/12 text-blue-600 border-blue-600/30",
    success: "bg-success/15 text-success border-success/40",
    danger: "bg-blue-600 text-white border-blue-600",
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
