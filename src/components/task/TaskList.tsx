import type { Task } from "@/types";
import { TaskCard } from "./TaskCard";

export function TaskList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) return null;
  return (
    <div className="biz-card rounded-lg overflow-hidden">
      {tasks.map((t, i) => (
        <TaskCard key={t.taskId} task={t} index={i} variant="row" />
      ))}
    </div>
  );
}
