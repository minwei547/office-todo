import { useMemo, useState, useCallback } from "react";
import {
  ChevronRight,
  ChevronUp,
  ChevronDown,
  CornerDownRight,
  CornerUpRight,
  Check,
  X,
} from "lucide-react";
import type { Task } from "@/types";
import { TaskCard } from "./TaskCard";
import { useTodoStore } from "@/store/todoStore";
import {
  buildTree,
  setDepth,
  flattenTree,
  childCount,
  getPrevSibling,
  getNextSibling,
} from "@/lib/tree";
import { cn } from "@/lib/utils";

export function TaskList({ tasks }: { tasks: Task[] }) {
  const allTasks = useTodoStore((s) => s.tasks);
  const indentTask = useTodoStore((s) => s.indentTask);
  const outdentTask = useTodoStore((s) => s.outdentTask);
  const swapTaskOrder = useTodoStore((s) => s.swapTaskOrder);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // 把传入的扁平 tasks 数组转为 Record，方便 buildTree
  const taskMap = useMemo(() => {
    const map: Record<string, Task> = {};
    for (const t of tasks) map[t.taskId] = t;
    return map;
  }, [tasks]);

  const tree = useMemo(() => {
    const rootTasks = tasks.filter((t) => !t.parentId || !taskMap[t.parentId]);
    const rootIds = new Set(rootTasks.map((t) => t.taskId));
    const filteredMap: Record<string, Task> = {};
    for (const t of tasks) {
      if (rootIds.has(t.taskId) || t.parentId) {
        filteredMap[t.taskId] = t;
      }
    }
    return setDepth(buildTree(filteredMap, null));
  }, [tasks, taskMap]);

  const flat = useMemo(() => flattenTree(tree, collapsed), [tree, collapsed]);

  const toggleCollapse = useCallback((taskId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  // ── 勾选操作 ──
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
    setSelected(new Set(flat.map((n) => n.task.taskId)));
  }, [flat]);

  // ── 层级调整操作 ──
  const canIndent = (taskId: string): boolean => {
    return getPrevSibling(allTasks, taskId) !== null;
  };
  const canOutdent = (taskId: string): boolean => {
    return !!allTasks[taskId]?.parentId;
  };
  const canMoveUp = (taskId: string): boolean => {
    return getPrevSibling(allTasks, taskId) !== null;
  };
  const canMoveDown = (taskId: string): boolean => {
    return getNextSibling(allTasks, taskId) !== null;
  };

  // 对所有选中的任务执行操作
  const handleIndent = async () => {
    for (const id of selected) {
      await indentTask(id);
    }
  };
  const handleOutdent = async () => {
    for (const id of selected) {
      await outdentTask(id);
    }
  };
  const handleMoveUp = async () => {
    for (const id of selected) {
      const prev = getPrevSibling(allTasks, id);
      if (prev) await swapTaskOrder(id, prev.taskId);
    }
  };
  const handleMoveDown = async () => {
    for (const id of selected) {
      const next = getNextSibling(allTasks, id);
      if (next) await swapTaskOrder(id, next.taskId);
    }
  };

  if (tasks.length === 0) return null;

  const selectedCount = selected.size;

  return (
    <div className="biz-card rounded-lg overflow-hidden">
      {/* 选中项工具栏 */}
      {selectedCount > 0 && (
        <div className="sticky top-0 z-20 bg-[#4a7a68] text-white px-3 py-2 flex items-center gap-1.5 shadow-md">
          <span className="text-xs font-medium mr-1">已选 {selectedCount} 项</span>
          <button
            onClick={handleMoveUp}
            className="flex items-center gap-1 px-2 py-1 rounded bg-white/15 hover:bg-white/25 transition-colors text-xs"
            title="上移"
          >
            <ChevronUp size={14} />
            上移
          </button>
          <button
            onClick={handleMoveDown}
            className="flex items-center gap-1 px-2 py-1 rounded bg-white/15 hover:bg-white/25 transition-colors text-xs"
            title="下移"
          >
            <ChevronDown size={14} />
            下移
          </button>
          <div className="w-px h-4 bg-white/30 mx-0.5" />
          <button
            onClick={handleIndent}
            className="flex items-center gap-1 px-2 py-1 rounded bg-white/15 hover:bg-white/25 transition-colors text-xs"
            title="降级为子项"
          >
            <CornerDownRight size={14} />
            降级
          </button>
          <button
            onClick={handleOutdent}
            className="flex items-center gap-1 px-2 py-1 rounded bg-white/15 hover:bg-white/25 transition-colors text-xs"
            title="升级（移出当前父级）"
          >
            <CornerUpRight size={14} />
            升级
          </button>
          <div className="w-px h-4 bg-white/30 mx-0.5" />
          <button
            onClick={selectAll}
            className="flex items-center gap-1 px-2 py-1 rounded bg-white/15 hover:bg-white/25 transition-colors text-xs"
            title="全选"
          >
            <Check size={14} />
            全选
          </button>
          <button
            onClick={clearSelection}
            className="flex items-center gap-1 px-2 py-1 rounded bg-white/15 hover:bg-white/25 transition-colors text-xs ml-auto"
            title="取消选择"
          >
            <X size={14} />
            取消
          </button>
        </div>
      )}

      {flat.map((node) => {
        const { task, depth } = node;
        const hasChildren = childCount(allTasks, task.taskId) > 0;
        const isCollapsed = collapsed.has(task.taskId);
        const isSelected = selected.has(task.taskId);

        return (
          <div
            key={task.taskId}
            className={cn(
              "relative transition-colors border-b border-black/[0.04] last:border-b-0",
              isSelected
                ? "bg-[#c8e9dd]/40 ring-1 ring-inset ring-[#4a7a68]/30"
                : "hover:bg-black/[0.015]",
            )}
          >
            <div
              className="flex items-center"
              style={{ paddingLeft: `${depth * 28}px` }}
            >
              {/* 勾选框 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(task.taskId);
                }}
                className={cn(
                  "shrink-0 w-6 h-6 grid place-items-center rounded transition-all ml-1 mr-0.5",
                  isSelected
                    ? "bg-[#4a7a68] border-[#4a7a68] text-white shadow-sm"
                    : "bg-white border-2 border-gray-300 hover:border-[#4a7a68] text-transparent",
                )}
                aria-label={isSelected ? "取消选择" : "选择"}
              >
                <Check size={13} strokeWidth={3} />
              </button>

              {/* 展开/折叠按钮 */}
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCollapse(task.taskId);
                  }}
                  className="shrink-0 w-6 h-9 grid place-items-center text-muted hover:text-ink transition-colors"
                  aria-label={isCollapsed ? "展开" : "折叠"}
                >
                  <ChevronRight
                    size={14}
                    className={cn(
                      "transition-transform",
                      !isCollapsed && "rotate-90",
                    )}
                  />
                </button>
              ) : (
                <div className="shrink-0 w-6 h-9" />
              )}

              {/* 任务卡片 */}
              <div className="flex-1 min-w-0">
                <TaskCard task={task} variant="row" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
