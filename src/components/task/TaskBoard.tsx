import type { Task, TaskStatus } from "@/types";
import { STATUS_LABEL } from "@/types";
import { TaskCard } from "./TaskCard";

interface Column {
  status: TaskStatus;
  tasks: Task[];
}

export function TaskBoard({ columns }: { columns: Column[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {columns.map((col) => (
        <div key={col.status} className="min-w-0">
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted">
              {STATUS_LABEL[col.status]}
            </h3>
            <span className="mono-meta">{col.tasks.length}</span>
          </div>
          <div className="space-y-2 min-h-[60px]">
            {col.tasks.length === 0 ? (
              <div className="h-16 grid place-items-center text-[12px] text-muted/60 italic border border-dashed border-slate-300/15 rounded-lg">
                暂无
              </div>
            ) : (
              col.tasks.map((t, i) => (
                <TaskCard key={t.taskId} task={t} index={i} variant="tile" />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
