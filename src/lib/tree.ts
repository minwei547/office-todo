/**
 * 树形层级工具函数
 * - buildTree：从扁平 tasks 构建嵌套树
 * - getDescendantIds：获取所有后代 ID（用于拖拽时检测循环）
 */
import type { Task } from "@/types";

export interface TaskNode {
  task: Task;
  children: TaskNode[];
  depth: number;
}

/** 从扁平 tasks Record 构建树形结构，按 sortOrder 排序 */
export function buildTree(
  tasks: Record<string, Task>,
  rootParentId: string | null = null,
): TaskNode[] {
  const allTasks = Object.values(tasks);
  return buildLevel(allTasks, rootParentId);
}

function buildLevel(allTasks: Task[], parentId: string | null): TaskNode[] {
  return allTasks
    .filter((t) => (t.parentId ?? null) === parentId)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.createdAt - b.createdAt)
    .map((task) => ({
      task,
      children: buildLevel(allTasks, task.taskId),
      depth: 0,
    }));
}

/** 给树节点设置深度 */
export function setDepth(nodes: TaskNode[], depth = 0): TaskNode[] {
  for (const node of nodes) {
    node.depth = depth;
    setDepth(node.children, depth + 1);
  }
  return nodes;
}

/** 获取某个任务的所有后代 ID */
export function getDescendantIds(
  tasks: Record<string, Task>,
  taskId: string,
): Set<string> {
  const result = new Set<string>();
  function collect(id: string) {
    for (const t of Object.values(tasks)) {
      if (t.parentId === id) {
        result.add(t.taskId);
        collect(t.taskId);
      }
    }
  }
  collect(taskId);
  return result;
}

/** 将树展开为扁平列表（用于渲染，保留 depth 信息） */
export function flattenTree(
  nodes: TaskNode[],
  collapsed: Set<string>,
): TaskNode[] {
  const result: TaskNode[] = [];
  function walk(list: TaskNode[]) {
    for (const node of list) {
      result.push(node);
      if (!collapsed.has(node.task.taskId)) {
        walk(node.children);
      }
    }
  }
  walk(nodes);
  return result;
}

/** 统计直接子任务数 */
export function childCount(tasks: Record<string, Task>, parentId: string): number {
  return Object.values(tasks).filter((t) => t.parentId === parentId).length;
}
