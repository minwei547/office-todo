// REST API 客户端：所有请求带 x-member-id 头
// 前缀 /api 由 vite proxy 转发到后端（生产环境由后端静态托管同源）

const MEMBER_KEY = "office-todo-member-id";

export function getMemberId(): string | null {
  return localStorage.getItem(MEMBER_KEY);
}

export function setMemberId(id: string | null) {
  if (id) localStorage.setItem(MEMBER_KEY, id);
  else localStorage.removeItem(MEMBER_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const memberId = getMemberId();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (memberId) headers["x-member-id"] = memberId;

  const res = await fetch(path, { ...options, headers });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && (data as any).error) ||
      `请求失败 (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export const api = {
  // 团队
  createTeam: (teamName: string, nickname: string) =>
    request<{ teamId: string; memberId: string; inviteCode: string }>(
      "/api/teams",
      { method: "POST", body: JSON.stringify({ teamName, nickname }) },
    ),
  joinTeam: (inviteCode: string, nickname: string) =>
    request<{ teamId: string; memberId: string }>("/api/teams/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode, nickname }) ,
    }),
  getTeam: (teamId: string) =>
    request<{ team: any; members: any[] }>(`/api/teams/${teamId}`),
  renameTeam: (teamId: string, teamName: string) =>
    request(`/api/teams/${teamId}`, {
      method: "PATCH",
      body: JSON.stringify({ teamName }),
    }),
  updateNickname: (memberId: string, nickname: string) =>
    request(`/api/members/${memberId}`, {
      method: "PATCH",
      body: JSON.stringify({ nickname }),
    }),

  // 任务
  getTeamTasks: (teamId: string) =>
    request<{ tasks: any[]; activities: any[]; notes: any[] }>(
      `/api/teams/${teamId}/tasks`,
    ),
  createTask: (input: {
    title: string;
    description?: string;
    assigneeId?: string | null;
    priority?: string;
    dueDate?: string | null;
    tags?: string[];
  }) =>
    request<{ task: any; activity: any }>("/api/tasks", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateTask: (taskId: string, patch: Record<string, any>) =>
    request<{ task: any; activity: any }>(`/api/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  setTaskStatus: (taskId: string, status: string) =>
    request<{ task: any; activity: any }>(`/api/tasks/${taskId}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),
  setTaskProgress: (taskId: string, progress: number) =>
    request<{ task: any; activity: any }>(`/api/tasks/${taskId}/progress`, {
      method: "POST",
      body: JSON.stringify({ progress }),
    }),
  deleteTask: (taskId: string) =>
    request<{ ok: boolean }>(`/api/tasks/${taskId}`, { method: "DELETE" }),

  // 备注
  addNote: (taskId: string, content: string) =>
    request<{ note: any; activity: any }>(`/api/tasks/${taskId}/notes`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  // 私信
  getConversations: () =>
    request<{ conversations: any[] }>(`/api/messages`),
  getConversation: (peerId: string) =>
    request<{ messages: any[] }>(`/api/messages/${peerId}`),
  sendMessage: (receiverId: string, content: string) =>
    request<{ message: any }>(`/api/messages`, {
      method: "POST",
      body: JSON.stringify({ receiverId, content }),
    }),
  markRead: (peerId: string) =>
    request<{ ok: boolean }>(`/api/messages/${peerId}/read`, {
      method: "POST",
    }),

  // 导出
  exportTeam: (teamId: string) =>
    request<any>(`/api/teams/${teamId}/export`),
};
