import { useMemo, useState, useCallback } from "react";
import { ChevronRight, Plus } from "lucide-react";
import type { Task } from "@/types";
import { TaskCard } from "./TaskCard";
import { useTodoStore } from "@/store/todoStore";
import {
  buildTree,
  setDepth,
  flattenTree,
  getDescendantIds,
  childCount,
} from "@/lib/tree";
import { cn } from "@/lib/utils";

export function TaskList({ tasks }: { tasks: Task[] }) {
  const allTasks = useTodoStore((s) => s.tasks);
  const moveTask = useTodoStore((s) => s.moveTask);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverPos, setDragOverPos] = useState<"before" | "after" | "inside" | null>(null);

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

  // ── 拖拽处理 ──
  function handleDragStart(e: React.DragEvent, taskId: string) {
    setDragId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
  }

  function handleDragOver(e: React.DragEvent, taskId: string) {
    if (!dragId || dragId === taskId) return;
    // 防止拖到自己的后代上
    const descendants = getDescendantIds(allTasks, dragId);
    if (descendants.has(taskId)) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;

    if (y < h * 0.25) {
      setDragOverId(taskId);
      setDragOverPos("before");
    } else if (y > h * 0.75) {
      setDragOverId(taskId);
      setDragOverPos("after");
    } else {
      setDragOverId(taskId);
      setDragOverPos("inside");
    }
  }

  function handleDrop(e: React.DragEvent, targetTaskId: string) {
    e.preventDefault();
    if (!dragId || dragId === targetTaskId) {
      resetDrag();
      return;
    }

    const descendants = getDescendantIds(allTasks, dragId);
    if (descendants.has(targetTaskId)) {
      resetDrag();
      return;
    }

    const targetTask = allTasks[targetTaskId];
    if (!targetTask) {
      resetDrag();
      return;
    }

    let newParentId: string | null;
    let newOrder: number;

    if (dragOverPos === "inside") {
      // 嵌套到目标任务下
      newParentId = targetTaskId;
      const siblings = Object.values(allTasks).filter(
        (t) => t.parentId === targetTaskId,
      );
      newOrder = siblings.length;
    } else {
      // 同级排序：before 或 after
      newParentId = targetTask.parentId ?? null;
      const siblings = Object.values(allTasks)
        .filter((t) => (t.parentId ?? null) === newParentId && t.taskId !== dragId)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      const targetIdx = siblings.findIndex((t) => t.taskId === targetTaskId);
      if (dragOverPos === "before") {
        newOrder = targetIdx >= 0 ? siblings[targetIdx].sortOrder - 0.5 : 0;
      } else {
        newOrder = targetIdx >= 0 ? siblings[targetIdx].sortOrder + 0.5 : siblings.length;
      }
    }

    moveTask(dragId, newParentId, newOrder);
    resetDrag();
  }

  function resetDrag() {
    setDragId(null);
    setDragOverId(null);
    setDragOverPos(null);
  }

  if (tasks.length === 0) return null;

  return (
    <div className="biz-card rounded-lg overflow-hidden">
      {flat.map((node) => {
        const { task, depth } = node;
        const hasChildren = childCount(allTasks, task.taskId) > 0;
        const isCollapsed = collapsed.has(task.taskId);
        const isDragOver = dragOverId === task.taskId;
        const isDragging = dragId === task.taskId;

        return (
          <div
            key={task.taskId}
            draggable
            onDragStart={(e) => handleDragStart(e, task.taskId)}
            onDragOver={(e) => handleDragOver(e, task.taskId)}
            onDragLeave={() => {
              if (dragOverId === task.taskId) setDragOverId(null);
            }}
            onDrop={(e) => handleDrop(e, task.taskId)}
            onDragEnd={resetDrag}
            className={cn(
              "relative transition-colors",
              isDragging && "opacity-40",
              isDragOver && dragOverPos === "inside" && "bg-mint-soft/50 ring-1 ring-mint/30",
            )}
          >
            {/* 拖拽放置指示线 */}
            {isDragOver && dragOverPos === "before" && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#4a7a68] z-10" />
            )}
            {isDragOver && dragOverPos === "after" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4a7a68] z-10" />
            )}

            <div
              className="flex items-center"
              style={{ paddingLeft: `${depth * 28}px` }}
            >
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
