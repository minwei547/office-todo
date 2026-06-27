// 任务状态：待办 / 进行中 / 已完成
export type TaskStatus = "todo" | "in_progress" | "done";

// 优先级：低 / 中 / 高 / 紧急
export type Priority = "low" | "medium" | "high" | "urgent";

export interface Team {
  teamId: string;
  teamName: string;
  inviteCode: string; // 6 位邀请口令
  createdAt: number;
  ownerId: string;
}

export interface Member {
  memberId: string;
  teamId: string;
  nickname: string;
  avatarChar: string; // 昵称首字
  joinedAt: number;
}

export interface Task {
  taskId: string;
  teamId: string;
  title: string;
  description: string;
  assigneeId: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null; // ISO 日期 YYYY-MM-DD
  tags: string[];
  progress: number; // 0-100，进度百分比
  createdAt: number;
  updatedAt: number;
  archived: boolean;
}

export type ActivityType =
  | "created"
  | "assigned"
  | "status_changed"
  | "edited"
  | "completed"
  | "note_added";

export interface Activity {
  activityId: string;
  taskId: string;
  actorId: string;
  type: ActivityType;
  payload: string; // JSON 字符串，记录变更内容
  timestamp: number;
}

export interface Note {
  noteId: string;
  taskId: string;
  authorId: string;
  content: string;
  timestamp: number;
}

// 私信：团队成员一对一消息
export interface DirectMessage {
  messageId: string;
  teamId: string;
  // 会话 ID：双方 memberId 字典序拼接，保证两端一致
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number;
  read: boolean;
}

// localStorage 顶层结构
export interface PersistedState {
  currentMemberId: string | null;
  teams: Record<string, Team>;
  members: Record<string, Member>;
  tasks: Record<string, Task>;
  activities: Record<string, Activity>;
  notes: Record<string, Note>;
  messages: Record<string, DirectMessage>;
}

// 筛选条件
export interface TaskFilter {
  assigneeId: string | "all" | "unassigned";
  tag: string | "all";
  priority: Priority | "all";
  status: TaskStatus | "all";
  keyword: string;
}

export type SortKey = "dueDate" | "createdAt" | "priority";

export type ViewMode = "list" | "board";

// 文案常量
export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "待办",
  in_progress: "进行中",
  done: "已完成",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "低",
  medium: "中",
  high: "高",
  urgent: "紧急",
};

// 优先级排序权重（用于排序）
export const PRIORITY_WEIGHT: Record<Priority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};
