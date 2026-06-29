import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Priority, TaskStatus } from "@/types";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/types";

// 状态徽章：柔和马卡龙
const STATUS_STYLE: Record<TaskStatus, string> = {
  todo: "bg-bg-soft text-muted border-line",
  in_progress: "bg-sky-soft text-[#3a5a78] border-sky",
  done: "bg-mint-soft text-[#4a7a68] border-mint line-through decoration-[#6fbf8e]/50",
};

const PRIORITY_STYLE: Record<Priority, string> = {
  low: "bg-bg-soft text-muted border-line",
  medium: "bg-sky-soft text-[#3a5a78] border-sky",
  high: "bg-lilac-soft text-[#5a4a78] border-lilac",
  urgent: "bg-peach-soft text-[#a85c4a] border-peach",
};

const PRIORITY_DOT: Record<Priority, string> = {
  low: "bg-muted",
  medium: "bg-info",
  high: "bg-violet",
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
        "inline-flex items-center gap-1.5 h-5 px-2 text-[11px] font-medium border rounded-full",
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
        "inline-flex items-center gap-1.5 h-5 px-2 text-[11px] font-medium border rounded-full",
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
    neutral: "bg-bg-soft text-muted border-line",
    accent: "bg-mint-soft text-[#4a7a68] border-mint",
    success: "bg-mint-soft text-[#4a7a68] border-mint",
    danger: "bg-peach text-[#5a3a2a] border-peach",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 text-[11px] font-mono font-medium border rounded-full",
        toneClass,
        className,
      )}
    >
      {children}
    </span>
  );
}
