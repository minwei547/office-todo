import { Check, Circle, Loader2, MessageCircle } from "lucide-react";
import type { Task } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { PriorityBadge } from "@/components/ui/Badge";
import { ProgressBar } from "./ProgressBar";
import { useTodoStore } from "@/store/todoStore";
import { useUIStore } from "@/store/uiStore";
import { describeDueDate } from "@/lib/date";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  index?: number;
  variant?: "row" | "tile";
}

const DUE_TONE_CLASS = {
  neutral: "text-muted",
  warn: "text-accent",
  danger: "text-accent font-semibold",
  done: "text-success",
} as const;

export function TaskCard({ task, index = 0, variant = "row" }: TaskCardProps) {
  const members = useTodoStore((s) => s.members);
  const notes = useTodoStore((s) => s.notes);
  const activities = useTodoStore((s) => s.activities);
  const setTaskStatus = useTodoStore((s) => s.setTaskStatus);
  const openTask = useUIStore((s) => s.openTask);

  const assignee = task.assigneeId ? members[task.assigneeId] : null;
  const due = describeDueDate(task.dueDate, task.status === "done");
  const noteCount = Object.values(notes).filter(
    (n) => n.taskId === task.taskId,
  ).length;
  const activityCount = Object.values(activities).filter(
    (a) => a.taskId === task.taskId,
  ).length;

  function toggleDone(e: React.MouseEvent) {
    e.stopPropagation();
    setTaskStatus(task.taskId, task.status === "done" ? "todo" : "done");
  }

  function cycleStatus(e: React.MouseEvent) {
    e.stopPropagation();
    const next =
      task.status === "todo"
        ? "in_progress"
        : task.status === "in_progress"
          ? "done"
          : "todo";
    setTaskStatus(task.taskId, next);
  }

  const isDone = task.status === "done";
  const isInProgress = task.status === "in_progress";

  if (variant === "tile") {
    return (
      <article
        onClick={() => openTask(task.taskId)}
        style={{ animationDelay: `${Math.min(index * 30, 240)}ms` }}
        className={cn(
          "group relative bg-paper border border-ink/15 hover:border-ink/40 hover:shadow-paper rounded-[2px] p-3 cursor-pointer transition-all animate-fade-up",
          isDone && "opacity-60",
        )}
      >
        {/* 优先级色条 */}
        <span
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1",
            task.priority === "urgent" && "bg-accent",
            task.priority === "high" && "bg-accent/70",
            task.priority === "medium" && "bg-ink/30",
            task.priority === "low" && "bg-ink/15",
          )}
        />
        <div className="flex items-start gap-2 pl-1">
          <button
            onClick={cycleStatus}
            className="mt-0.5 shrink-0 text-muted hover:text-accent"
            aria-label="切换状态"
          >
            {isDone ? (
              <Check size={16} className="text-success" />
            ) : isInProgress ? (
              <Loader2 size={16} className="text-accent animate-spin" />
            ) : (
              <Circle size={16} />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                "font-display text-[15px] leading-snug text-ink",
                isDone && "line-through text-muted",
              )}
            >
              {task.title}
            </h3>
            {task.description ? (
              <p className="text-[12px] text-muted line-clamp-2 mt-1">
                {task.description}
              </p>
            ) : null}
            {task.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {task.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] text-muted bg-chip/70 px-1.5 h-4 inline-flex items-center rounded-[2px]"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        {/* 进度条 */}
        {task.progress > 0 || isDone ? (
          <div className="mt-2 pl-6">
            <ProgressBar
              progress={task.progress}
              status={task.status}
              showLabel
            />
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-2 mt-2.5 pl-6">
          <div className="flex items-center gap-1.5">
            <PriorityBadge priority={task.priority} />
            <span
              className={cn(
                "font-mono text-[10px] tracking-wide",
                DUE_TONE_CLASS[due.tone],
              )}
            >
              {due.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {noteCount > 0 ? (
              <span className="flex items-center gap-0.5 text-muted text-[10px]">
                <MessageCircle size={11} /> {noteCount}
              </span>
            ) : null}
            {assignee ? (
              <Avatar char={assignee.avatarChar} size="xs" title={assignee.nickname} />
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  // 列表行
  return (
    <article
      onClick={() => openTask(task.taskId)}
      style={{ animationDelay: `${Math.min(index * 24, 200)}ms` }}
      className={cn(
        "group grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3.5 py-2.5 border-b border-ink/8 hover:bg-chip/40 cursor-pointer transition-colors animate-fade-up",
        isDone && "opacity-55",
      )}
    >
      {/* 完成勾选 */}
      <button
        onClick={toggleDone}
        className={cn(
          "h-5 w-5 shrink-0 grid place-items-center rounded-full border transition-colors",
          isDone
            ? "bg-success border-success text-paper"
            : "border-ink/30 hover:border-accent hover:text-accent",
        )}
        aria-label={isDone ? "标记为待办" : "标记为完成"}
      >
        {isDone ? <Check size={12} /> : null}
      </button>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {isInProgress ? (
            <Loader2 size={12} className="text-accent animate-spin shrink-0" />
          ) : null}
          <h3
            className={cn(
              "font-display text-[15px] text-ink truncate",
              isDone && "line-through text-muted",
            )}
          >
            {task.title}
          </h3>
          {task.progress > 0 || isDone ? (
            <span className="mono-meta shrink-0">{task.progress}%</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <PriorityBadge priority={task.priority} />
          <span
            className={cn(
              "font-mono text-[10px] tracking-wide",
              DUE_TONE_CLASS[due.tone],
            )}
          >
            {due.label}
          </span>
          {task.tags.length > 0 ? (
            <span className="text-[10px] text-muted">
              {task.tags.map((t) => `#${t}`).join(" ")}
            </span>
          ) : null}
          {noteCount > 0 ? (
            <span className="flex items-center gap-0.5 text-muted text-[10px]">
              <MessageCircle size={10} /> {noteCount}
            </span>
          ) : null}
          {activityCount > 0 ? (
            <span className="mono-meta">{activityCount} 项记录</span>
          ) : null}
        </div>
        {task.progress > 0 || isDone ? (
          <ProgressBar
            progress={task.progress}
            status={task.status}
            className="mt-1.5 max-w-[280px]"
          />
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {assignee ? (
          <div className="flex items-center gap-1.5">
            <Avatar char={assignee.avatarChar} size="xs" />
            <span className="text-[11px] text-muted hidden sm:inline">
              {assignee.nickname}
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-muted/70 italic">未指派</span>
        )}
      </div>
    </article>
  );
}
