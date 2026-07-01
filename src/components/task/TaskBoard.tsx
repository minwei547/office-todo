import { useMemo, useState, useCallback } from "react";
import {
  ChevronUp,
  ChevronDown,
  CornerDownRight,
  CornerUpRight,
  Check,
  X,
} from "lucide-react";
import type { Task, TaskStatus } from "@/types";
import { STATUS_LABEL } from "@/types";
import { TaskCard } from "./TaskCard";
import { useTodoStore } from "@/store/todoStore";
import { getPrevSibling, getNextSibling } from "@/lib/tree";
import { cn } from "@/lib/utils";

interface Column {
  status: TaskStatus;
  tasks: Task[];
}

export function TaskBoard({ columns }: { columns: Column[] }) {
  const allTasks = useTodoStore((s) => s.tasks);
  const indentTask = useTodoStore((s) => s.indentTask);
  const outdentTask = useTodoStore((s) => s.outdentTask);
  const swapTaskOrder = useTodoStore((s) => s.swapTaskOrder);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // 看板内全部任务（用于全选）
  const allBoardTasks = useMemo(
    () => columns.flatMap((c) => c.tasks),
    [columns],
  );

  const toggleSelect = useCallback((taskId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);
  const selectAll = useCallback(() => {
    setSelected(new Set(allBoardTasks.map((t) => t.taskId)));
  }, [allBoardTasks]);

  // 判断选中项中是否有任意一项可执行该操作
  const canAnyIndent = useMemo(
    () => [...selected].some((id) => getPrevSibling(allTasks, id) !== null),
    [selected, allTasks],
  );
  const canAnyOutdent = useMemo(
    () => [...selected].some((id) => !!allTasks[id]?.parentId),
    [selected, allTasks],
  );
  const canAnyMoveUp = canAnyIndent;
  const canAnyMoveDown = useMemo(
    () => [...selected].some((id) => getNextSibling(allTasks, id) !== null),
    [selected, allTasks],
  );

  const handleIndent = async () => {
    for (const id of selected) {
      try {
        await indentTask(id);
      } catch (e) {
        console.warn("降级失败:", e);
      }
    }
  };
  const handleOutdent = async () => {
    for (const id of selected) {
      try {
        await outdentTask(id);
      } catch (e) {
        console.warn("升级失败:", e);
      }
    }
  };
  const handleMoveUp = async () => {
    for (const id of selected) {
      const prev = getPrevSibling(allTasks, id);
      if (prev) {
        try {
          await swapTaskOrder(id, prev.taskId);
        } catch (e) {
          console.warn("上移失败:", e);
        }
      }
    }
  };
  const handleMoveDown = async () => {
    for (const id of selected) {
      const next = getNextSibling(allTasks, id);
      if (next) {
        try {
          await swapTaskOrder(id, next.taskId);
        } catch (e) {
          console.warn("下移失败:", e);
        }
      }
    }
  };

  const selectedCount = selected.size;

  const btnClass = (disabled: boolean) =>
    cn(
      "flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs",
      disabled
        ? "bg-white/10 text-white/40 cursor-not-allowed"
        : "bg-white/15 hover:bg-white/25 text-white",
    );

  return (
    <div>
      {/* 选中项工具栏 */}
      {selectedCount > 0 && (
        <div className="sticky top-0 z-20 biz-card rounded-lg mb-3 bg-[#4a7a68] text-white px-3 py-2 flex items-center gap-1.5 shadow-md">
          <span className="text-xs font-medium mr-1">已选 {selectedCount} 项</span>
          <button
            onClick={handleMoveUp}
            disabled={!canAnyMoveUp}
            className={btnClass(!canAnyMoveUp)}
            title="上移"
          >
            <ChevronUp size={14} />
            上移
          </button>
          <button
            onClick={handleMoveDown}
            disabled={!canAnyMoveDown}
            className={btnClass(!canAnyMoveDown)}
            title="下移"
          >
            <ChevronDown size={14} />
            下移
          </button>
          <div className="w-px h-4 bg-white/30 mx-0.5" />
          <button
            onClick={handleIndent}
            disabled={!canAnyIndent}
            className={btnClass(!canAnyIndent)}
            title="降级为子项"
          >
            <CornerDownRight size={14} />
            降级
          </button>
          <button
            onClick={handleOutdent}
            disabled={!canAnyOutdent}
            className={btnClass(!canAnyOutdent)}
            title="升级（移出当前父级）"
          >
            <CornerUpRight size={14} />
            升级
          </button>
          <div className="w-px h-4 bg-white/30 mx-0.5" />
          <button
            onClick={selectAll}
            className={btnClass(false)}
            title="全选"
          >
            <Check size={14} />
            全选
          </button>
          <button
            onClick={clearSelection}
            className={btnClass(false) + " ml-auto"}
            title="取消选择"
          >
            <X size={14} />
            取消
          </button>
        </div>
      )}

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
                <div className="h-16 grid place-items-center text-[12px] text-dim italic border border-dashed border-line rounded-lg">
                  暂无
                </div>
              ) : (
                col.tasks.map((t, i) => {
                  const isSel = selected.has(t.taskId);
                  return (
                    <div
                      key={t.taskId}
                      className={cn(
                        "relative rounded-lg transition-all",
                        isSel && "ring-2 ring-[#4a7a68] ring-offset-1",
                      )}
                    >
                      {/* 勾选框（右上角） */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(t.taskId);
                        }}
                        className={cn(
                          "absolute right-2 top-2 z-10 w-5 h-5 grid place-items-center rounded transition-all shadow-sm",
                          isSel
                            ? "bg-[#4a7a68] border-2 border-[#4a7a68] text-white"
                            : "bg-white/90 border-2 border-gray-300 hover:border-[#4a7a68] text-transparent",
                        )}
                        aria-label={isSel ? "取消选择" : "选择"}
                      >
                        <Check size={12} strokeWidth={3} />
                      </button>
                      <TaskCard task={t} index={i} variant="tile" />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
