import type { SortKey, Task, TaskFilter } from "@/types";
import { PRIORITY_WEIGHT } from "@/types";
import { parseISO, todayISO } from "@/lib/date";

export const DEFAULT_FILTER: TaskFilter = {
  assigneeId: "all",
  tag: "all",
  priority: "all",
  status: "all",
  keyword: "",
};

export function matchFilter(task: Task, filter: TaskFilter): boolean {
  if (filter.assigneeId === "unassigned") {
    if (task.assigneeId !== null) return false;
  } else if (filter.assigneeId !== "all") {
    if (task.assigneeId !== filter.assigneeId) return false;
  }
  if (filter.tag !== "all" && !task.tags.includes(filter.tag)) return false;
  if (filter.priority !== "all" && task.priority !== filter.priority)
    return false;
  if (filter.status !== "all" && task.status !== filter.status) return false;
  if (filter.keyword.trim()) {
    const kw = filter.keyword.trim().toLowerCase();
    const inTitle = task.title.toLowerCase().includes(kw);
    const inDesc = task.description.toLowerCase().includes(kw);
    const inTags = task.tags.some((t) => t.toLowerCase().includes(kw));
    if (!inTitle && !inDesc && !inTags) return false;
  }
  return true;
}

export function sortTasks(tasks: Task[], key: SortKey): Task[] {
  const today = parseISO(todayISO())!.getTime();
  const arr = [...tasks];
  switch (key) {
    case "dueDate":
      // 无截止日排到最后；有截止日按时间升序（早的在前）
      arr.sort((a, b) => {
        const av = a.dueDate ? parseISO(a.dueDate)?.getTime() ?? Infinity : Infinity;
        const bv = b.dueDate ? parseISO(b.dueDate)?.getTime() ?? Infinity : Infinity;
        return av - bv;
      });
      break;
    case "createdAt":
      arr.sort((a, b) => b.createdAt - a.createdAt);
      break;
    case "priority":
      arr.sort(
        (a, b) =>
          PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] ||
          a.createdAt - b.createdAt,
      );
      break;
  }
  // 完成的任务永远沉底
  arr.sort((a, b) => {
    if (a.status === "done" && b.status !== "done") return 1;
    if (a.status !== "done" && b.status === "done") return -1;
    return 0;
  });
  // 逾期的优先提到最前（仅在未完成时）
  arr.sort((a, b) => {
    if (a.status === "done" || b.status === "done") return 0;
    const aOver = a.dueDate
      ? (parseISO(a.dueDate)?.getTime() ?? Infinity) < today
      : false;
    const bOver = b.dueDate
      ? (parseISO(b.dueDate)?.getTime() ?? Infinity) < today
      : false;
    if (aOver && !bOver) return -1;
    if (!aOver && bOver) return 1;
    return 0;
  });
  return arr;
}

export function filterAndSort(
  tasks: Record<string, Task>,
  teamId: string,
  filter: TaskFilter,
  sort: SortKey,
  includeArchived = false,
  currentMemberId?: string | null,
  isOwner?: boolean,
): Task[] {
  const list = Object.values(tasks).filter((t) => {
    if (t.teamId !== teamId) return false;
    if (!includeArchived && t.archived) return false;
    // 角色权限：队员只能看到分配给自己的任务；队长可以看到全部任务
    if (!isOwner && currentMemberId) {
      if (t.assigneeId && t.assigneeId !== currentMemberId) return false;
    }
    return true;
  });
  const matched = list.filter((t) => matchFilter(t, filter));
  return sortTasks(matched, sort);
}

// 看板视图：按状态分组
export function groupByStatus(tasks: Task[]): Record<string, Task[]> {
  return {
    todo: tasks.filter((t) => t.status === "todo"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    done: tasks.filter((t) => t.status === "done"),
  };
}
