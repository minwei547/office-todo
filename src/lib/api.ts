import { supabase } from "./supabase";

const MEMBER_KEY = "office-todo-member-id";

export function getMemberId(): string | null {
  return localStorage.getItem(MEMBER_KEY);
}

export function setMemberId(id: string | null) {
  if (id) localStorage.setItem(MEMBER_KEY, id);
  else localStorage.removeItem(MEMBER_KEY);
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function shortId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 10)}`;
}

function avatarCharFrom(nickname: string): string {
  const t = (nickname || "?").trim();
  return t ? Array.from(t)[0]!.toUpperCase() : "?";
}

function conversationIdOf(a: string, b: string): string {
  return [a, b].sort().join(":");
}

function rowToTask(row: any) {
  if (!row) return row;
  return {
    ...row,
    tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags ?? "[]"),
    archived: !!row.archived,
  };
}

function rowToMessage(row: any) {
  return { ...row, read: !!row.read };
}

async function getMember(): Promise<any> {
  const memberId = getMemberId();
  if (!memberId) throw new Error("未登录");
  const { data: member, error } = await supabase
    .from("members")
    .select("*")
    .eq("memberId", memberId)
    .single();
  if (error || !member) throw new Error("成员不存在");
  return member;
}

export const api = {
  async createTeam(teamName: string, nickname: string) {
    if (!teamName.trim() || !nickname.trim()) throw new Error("teamName 与 nickname 必填");
    const teamId = shortId("t");
    const memberId = shortId("m");
    const now = Date.now();
    const inviteCode = generateInviteCode();
    const { error: e1 } = await supabase.from("teams").insert([
      { teamId, teamName: teamName.trim(), inviteCode, ownerId: memberId, createdAt: now },
    ]);
    if (e1) throw new Error(e1.message);
    const { error: e2 } = await supabase.from("members").insert([
      { memberId, teamId, nickname: nickname.trim(), avatarChar: avatarCharFrom(nickname), joinedAt: now },
    ]);
    if (e2) throw new Error(e2.message);
    return { teamId, memberId, inviteCode };
  },

  async joinTeam(inviteCode: string, nickname: string) {
    if (!inviteCode.trim() || !nickname.trim()) throw new Error("inviteCode 与 nickname 必填");
    const { data: team, error } = await supabase
      .from("teams")
      .select("*")
      .eq("inviteCode", inviteCode.trim().toUpperCase())
      .single();
    if (error || !team) throw new Error("邀请码无效");
    const memberId = shortId("m");
    const now = Date.now();
    const { error: e2 } = await supabase.from("members").insert([
      { memberId, teamId: team.teamId, nickname: nickname.trim(), avatarChar: avatarCharFrom(nickname), joinedAt: now },
    ]);
    if (e2) throw new Error(e2.message);
    return { teamId: team.teamId, memberId };
  },

  // 跨设备恢复身份：用邀请码+昵称找回已有成员
  async recoverMember(inviteCode: string, nickname: string) {
    if (!inviteCode.trim() || !nickname.trim()) throw new Error("inviteCode 与 nickname 必填");
    const { data: team, error } = await supabase
      .from("teams")
      .select("*")
      .eq("inviteCode", inviteCode.trim().toUpperCase())
      .single();
    if (error || !team) throw new Error("邀请码无效");
    const { data: member } = await supabase
      .from("members")
      .select("*")
      .eq("teamId", team.teamId)
      .eq("nickname", nickname.trim())
      .single();
    if (!member) throw new Error("未找到该昵称的成员，请确认昵称无误");
    return { teamId: team.teamId, memberId: member.memberId };
  },

  async getTeam(teamId: string) {
    const member = await getMember();
    const { data: team, error } = await supabase.from("teams").select("*").eq("teamId", teamId).single();
    if (error || !team) throw new Error("团队不存在");
    if (member.teamId !== team.teamId) throw new Error("无权访问该团队");
    const { data: members } = await supabase
      .from("members")
      .select("*")
      .eq("teamId", team.teamId)
      .order("joinedAt");
    return { team, members: members || [] };
  },

  async renameTeam(teamId: string, teamName: string) {
    const member = await getMember();
    const { data: team } = await supabase.from("teams").select("*").eq("teamId", teamId).single();
    if (!team) throw new Error("团队不存在");
    if (team.ownerId !== member.memberId) throw new Error("仅所有者可重命名");
    const name = teamName.trim();
    if (!name) throw new Error("团队名不能为空");
    const { error } = await supabase.from("teams").update({ teamName: name }).eq("teamId", teamId);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  async updateNickname(memberId: string, nickname: string) {
    const member = await getMember();
    if (memberId !== member.memberId) throw new Error("只能修改自己的昵称");
    const nick = nickname.trim();
    if (!nick) throw new Error("昵称不能为空");
    const { error } = await supabase
      .from("members")
      .update({ nickname: nick, avatarChar: avatarCharFrom(nick) })
      .eq("memberId", memberId);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  async getTeamTasks(teamId: string) {
    const member = await getMember();
    if (member.teamId !== teamId) throw new Error("无权访问");
    const { data: tasks } = await supabase.from("tasks").select("*").eq("teamId", teamId).order("createdAt");
    const taskIds = (tasks || []).map((t: any) => t.taskId);
    let activities: any[] = [];
    let notes: any[] = [];
    if (taskIds.length) {
      const [a, n] = await Promise.all([
        supabase.from("activities").select("*").in("taskId", taskIds),
        supabase.from("notes").select("*").in("taskId", taskIds),
      ]);
      activities = a.data || [];
      notes = n.data || [];
    }
    return {
      tasks: (tasks || []).map(rowToTask),
      activities,
      notes,
    };
  },

  async createTask(input: {
    title: string;
    description?: string;
    assigneeId?: string | null;
    priority?: string;
    dueDate?: string | null;
    tags?: string[];
  }) {
    const member = await getMember();
    const title = input.title.trim();
    if (!title) throw new Error("title 必填");
    const taskId = shortId("k");
    const now = Date.now();
    const { error } = await supabase.from("tasks").insert([
      {
        taskId,
        teamId: member.teamId,
        title,
        description: (input.description || "").trim(),
        assigneeId: input.assigneeId ?? null,
        status: "todo",
        priority: input.priority || "medium",
        dueDate: input.dueDate ?? null,
        tags: JSON.stringify(input.tags || []),
        progress: 0,
        createdAt: now,
        updatedAt: now,
        archived: false,
      },
    ]);
    if (error) throw new Error(error.message);
    const activityId = shortId("a");
    await supabase.from("activities").insert([
      { activityId, taskId, actorId: member.memberId, type: "created", payload: JSON.stringify({ title }), timestamp: now },
    ]);
    const { data: task } = await supabase.from("tasks").select("*").eq("taskId", taskId).single();
    const { data: activity } = await supabase.from("activities").select("*").eq("activityId", activityId).single();
    return { task: rowToTask(task), activity };
  },

  async updateTask(taskId: string, patch: Record<string, any>) {
    const member = await getMember();
    const { data: task } = await supabase.from("tasks").select("*").eq("taskId", taskId).single();
    if (!task) throw new Error("任务不存在");
    if (task.teamId !== member.teamId) throw new Error("无权访问");
    const allowed = ["title", "description", "assigneeId", "status", "priority", "dueDate", "tags", "progress", "archived"];
    const update: Record<string, any> = {};
    for (const k of allowed) {
      if (k in patch) update[k] = patch[k];
    }
    if ("tags" in update) update.tags = JSON.stringify(update.tags);
    const now = Date.now();
    update.updatedAt = now;
    const { error } = await supabase.from("tasks").update(update).eq("taskId", taskId);
    if (error) throw new Error(error.message);
    const activityId = shortId("a");
    await supabase.from("activities").insert([
      { activityId, taskId, actorId: member.memberId, type: "edited", payload: JSON.stringify(update), timestamp: now },
    ]);
    const { data: updated } = await supabase.from("tasks").select("*").eq("taskId", taskId).single();
    const { data: activity } = await supabase.from("activities").select("*").eq("activityId", activityId).single();
    return { task: rowToTask(updated), activity };
  },

  async setTaskStatus(taskId: string, status: string) {
    const member = await getMember();
    const { data: task } = await supabase.from("tasks").select("*").eq("taskId", taskId).single();
    if (!task) throw new Error("任务不存在");
    if (task.teamId !== member.teamId) throw new Error("无权访问");
    if (!["todo", "in_progress", "done"].includes(status)) throw new Error("非法状态");
    if (task.status === status) return { task: rowToTask(task), activity: null };
    let progress = task.progress;
    if (status === "done") progress = 100;
    else if (status === "todo") progress = 0;
    else if (status === "in_progress" && progress === 0) progress = 10;
    const now = Date.now();
    const { error } = await supabase.from("tasks").update({ status, progress, updatedAt: now }).eq("taskId", taskId);
    if (error) throw new Error(error.message);
    const activityId = shortId("a");
    const actType = status === "done" ? "completed" : "status_changed";
    await supabase.from("activities").insert([
      { activityId, taskId, actorId: member.memberId, type: actType, payload: JSON.stringify({ from: task.status, to: status, progress }), timestamp: now },
    ]);
    const { data: updated } = await supabase.from("tasks").select("*").eq("taskId", taskId).single();
    const { data: activity } = await supabase.from("activities").select("*").eq("activityId", activityId).single();
    return { task: rowToTask(updated), activity };
  },

  async setTaskProgress(taskId: string, newProgress: number) {
    const member = await getMember();
    const { data: task } = await supabase.from("tasks").select("*").eq("taskId", taskId).single();
    if (!task) throw new Error("任务不存在");
    if (task.teamId !== member.teamId) throw new Error("无权访问");
    let progress = Math.max(0, Math.min(100, Math.round(newProgress ?? 0)));
    let status = task.status;
    if (progress >= 100 && status !== "done") status = "done";
    else if (progress > 0 && progress < 100 && status === "todo") status = "in_progress";
    else if (progress < 100 && status === "done") status = "in_progress";
    const now = Date.now();
    const { error } = await supabase.from("tasks").update({ progress, status, updatedAt: now }).eq("taskId", taskId);
    if (error) throw new Error(error.message);
    const activityId = shortId("a");
    const actType = status !== task.status ? (status === "done" ? "completed" : "status_changed") : "edited";
    await supabase.from("activities").insert([
      { activityId, taskId, actorId: member.memberId, type: actType, payload: JSON.stringify({ from: task.status, to: status, progress }), timestamp: now },
    ]);
    const { data: updated } = await supabase.from("tasks").select("*").eq("taskId", taskId).single();
    const { data: activity } = await supabase.from("activities").select("*").eq("activityId", activityId).single();
    return { task: rowToTask(updated), activity };
  },

  async deleteTask(taskId: string) {
    const member = await getMember();
    const { data: task } = await supabase.from("tasks").select("*").eq("taskId", taskId).single();
    if (!task) throw new Error("任务不存在");
    if (task.teamId !== member.teamId) throw new Error("无权访问");
    const { error } = await supabase.from("tasks").delete().eq("taskId", taskId);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  async addNote(taskId: string, content: string) {
    const member = await getMember();
    const { data: task } = await supabase.from("tasks").select("*").eq("taskId", taskId).single();
    if (!task) throw new Error("任务不存在");
    if (task.teamId !== member.teamId) throw new Error("无权访问");
    const text = content.trim();
    if (!text) throw new Error("内容不能为空");
    const noteId = shortId("n");
    const now = Date.now();
    const { error } = await supabase.from("notes").insert([
      { noteId, taskId, authorId: member.memberId, content: text, timestamp: now },
    ]);
    if (error) throw new Error(error.message);
    const activityId = shortId("a");
    await supabase.from("activities").insert([
      { activityId, taskId, actorId: member.memberId, type: "note_added", payload: JSON.stringify({ content: text }), timestamp: now },
    ]);
    const { data: note } = await supabase.from("notes").select("*").eq("noteId", noteId).single();
    const { data: activity } = await supabase.from("activities").select("*").eq("activityId", activityId).single();
    return { note, activity };
  },

  async getConversations() {
    const member = await getMember();
    const me = member.memberId;
    const { data: rows } = await supabase
      .from("messages")
      .select("*")
      .eq("teamId", member.teamId)
      .or(`senderId.eq.${me},receiverId.eq.${me}`)
      .order("timestamp", { ascending: false });
    const convMap = new Map();
    for (const m of rows || []) {
      const peerId = m.senderId === me ? m.receiverId : m.senderId;
      if (!convMap.has(peerId)) {
        convMap.set(peerId, { peerId, lastMessage: rowToMessage(m), unread: 0 });
      }
    }
    for (const [peerId, conv] of convMap) {
      const { count } = await supabase
        .from("messages")
        .select("messageId", { count: "exact", head: true })
        .eq("conversationId", conversationIdOf(me, peerId))
        .eq("receiverId", me)
        .eq("read", false);
      conv.unread = count || 0;
    }
    return { conversations: Array.from(convMap.values()) };
  },

  async getConversation(peerId: string) {
    const member = await getMember();
    const convId = conversationIdOf(member.memberId, peerId);
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("conversationId", convId)
      .order("timestamp");
    return { messages: (messages || []).map(rowToMessage) };
  },

  async sendMessage(receiverId: string, content: string) {
    const member = await getMember();
    const text = content.trim();
    if (!receiverId || !text) throw new Error("receiverId 与 content 必填");
    const { data: receiver } = await supabase.from("members").select("*").eq("memberId", receiverId).single();
    if (!receiver || receiver.teamId !== member.teamId) throw new Error("接收方不在同一团队");
    const messageId = shortId("d");
    const now = Date.now();
    const convId = conversationIdOf(member.memberId, receiverId);
    const { error } = await supabase.from("messages").insert([
      { messageId, teamId: member.teamId, conversationId: convId, senderId: member.memberId, receiverId, content: text, timestamp: now, read: false },
    ]);
    if (error) throw new Error(error.message);
    const { data: message } = await supabase.from("messages").select("*").eq("messageId", messageId).single();
    return { message: rowToMessage(message) };
  },

  async markRead(peerId: string) {
    const member = await getMember();
    const convId = conversationIdOf(member.memberId, peerId);
    const { error } = await supabase
      .from("messages")
      .update({ read: true })
      .eq("conversationId", convId)
      .eq("receiverId", member.memberId)
      .eq("read", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  async exportTeam(teamId: string) {
    const member = await getMember();
    if (member.teamId !== teamId) throw new Error("无权访问");
    const { data: team } = await supabase.from("teams").select("*").eq("teamId", teamId).single();
    const { data: members } = await supabase.from("members").select("*").eq("teamId", teamId);
    const { data: tasks } = await supabase.from("tasks").select("*").eq("teamId", teamId);
    const taskIds = (tasks || []).map((t: any) => t.taskId);
    let activities: any[] = [];
    let notes: any[] = [];
    if (taskIds.length) {
      const [a, n] = await Promise.all([
        supabase.from("activities").select("*").in("taskId", taskIds),
        supabase.from("notes").select("*").in("taskId", taskIds),
      ]);
      activities = a.data || [];
      notes = n.data || [];
    }
    const { data: messages } = await supabase.from("messages").select("*").eq("teamId", teamId);
    return {
      team,
      members,
      tasks: (tasks || []).map(rowToTask),
      activities,
      notes,
      messages: (messages || []).map(rowToMessage),
      exportedAt: new Date().toISOString(),
    };
  },
};
