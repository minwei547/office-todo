import { cn } from "@/lib/utils";

interface ProgressBarProps {
  progress: number; // 0-100
  status?: "todo" | "in_progress" | "done";
  className?: string;
  showLabel?: boolean;
}

// 细线进度条：在任务卡片与详情抽屉中复用
export function ProgressBar({
  progress,
  status = "in_progress",
  className,
  showLabel = false,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  const tone =
    status === "done" || clamped >= 100
      ? "bg-[#6fbf8e]"
      : clamped > 0
        ? "bg-mint-gradient"
        : "bg-bg-soft";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 h-1 bg-bg-soft rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-300", tone)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel ? (
        <span className="font-mono text-[10px] text-muted tabular-nums w-8 text-right">
          {clamped}%
        </span>
      ) : null}
    </div>
  );
}
