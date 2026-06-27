import type { Member, Task } from "@/types";
import { parseISO, todayISO } from "@/lib/date";

export interface TeamStats {
  total: number;
  todo: number;
  in_progress: number;
  done: number;
  overdue: number;
  doneToday: number;
  byAssignee: Record<string, number>;
}

export function computeStats(
  tasks: Record<string, Task>,
  teamId: string,
): TeamStats {
  const list = Object.values(tasks).filter((t) => t.teamId === teamId);
  const today = todayISO();
  const todayTs = parseISO(today)!.getTime();

  const stats: TeamStats = {
    total: 0,
    todo: 0,
    in_progress: 0,
    done: 0,
    overdue: 0,
    doneToday: 0,
    byAssignee: {},
  };

  for (const t of list) {
    stats.total += 1;
    if (t.status === "todo") stats.todo += 1;
    if (t.status === "in_progress") stats.in_progress += 1;
    if (t.status === "done") stats.done += 1;
    // 逾期：未完成且截止日早于今天
    if (t.status !== "done" && t.dueDate) {
      const due = parseISO(t.dueDate);
      if (due && due.getTime() < todayTs) stats.overdue += 1;
    }
    // 今日完成：已完成且 updatedAt 为今天
    if (t.status === "done") {
      const updated = new Date(t.updatedAt);
      const updatedISO = `${updated.getFullYear()}-${String(
        updated.getMonth() + 1,
      ).padStart(2, "0")}-${String(updated.getDate()).padStart(2, "0")}`;
      if (updatedISO === today) stats.doneToday += 1;
    }
    if (t.assigneeId) {
      stats.byAssignee[t.assigneeId] = (stats.byAssignee[t.assigneeId] ?? 0) + 1;
    }
  }
  return stats;
}

// 收集团队下出现过的所有标签
export function collectTags(
  tasks: Record<string, Task>,
  teamId: string,
): string[] {
  const set = new Set<string>();
  for (const t of Object.values(tasks)) {
    if (t.teamId !== teamId) continue;
    for (const tag of t.tags) set.add(tag);
  }
  return Array.from(set).sort();
}

// 收集团队下所有成员（去重 by memberId）
export function collectMembers(
  members: Record<string, Member>,
  teamId: string,
): Member[] {
  return Object.values(members)
    .filter((m) => m.teamId === teamId)
    .sort((a, b) => a.joinedAt - b.joinedAt);
}
