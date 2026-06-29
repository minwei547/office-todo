import { supabase } from "./supabase";

const MEMBER_KEY = "office-todo-member-id";
const USER_KEY = "office-todo-user-id";

export function getMemberId(): string | null {
  return localStorage.getItem(MEMBER_KEY);
}

export function setMemberId(id: string | null) {
  if (id) localStorage.setItem(MEMBER_KEY, id);
  else localStorage.removeItem(MEMBER_KEY);
}

export function getUserId(): string | null {
  return localStorage.getItem(USER_KEY);
}

export function setUserId(id: string | null) {
  if (id) localStorage.setItem(USER_KEY, id);
  else localStorage.removeItem(USER_KEY);
}

// 密码哈希：SHA-256 + 固定盐（前端直连 Supabase，无后端）
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "office-todo-salt-2024");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
  // 注册
  async register(username: string, password: string, nickname: string) {
    const user = username.trim();
    const nick = nickname.trim();
    if (!user || !password || !nick) throw new Error("账号、密码、昵称都必填");
    if (user.length < 2) throw new Error("账号至少 2 个字符");
    if (password.length < 4) throw new Error("密码至少 4 位");
    // 检查用户名是否已存在
    const { data: existing } = await supabase
      .from("users")
      .select("userId")
      .eq("username", user)
      .maybeSingle();
    if (existing) throw new Error("该账号已注册");
    const userId = shortId("u");
    const passwordHash = await hashPassword(password);
    const now = Date.now();
    const { error } = await supabase.from("users").insert([
      { userId, username: user, passwordHash, nickname: nick, createdAt: now },
    ]);
    if (error) throw new Error(error.message);
    return { userId, username: user, nickname: nick };
  },

  // 登录
  async login(username: string, password: string) {
    const user = username.trim();
    if (!user || !password) throw new Error("账号和密码必填");
    const passwordHash = await hashPassword(password);
    const { data: u, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", user)
      .eq("passwordHash", passwordHash)
      .single();
    if (error || !u) throw new Error("账号或密码错误");
    return { userId: u.userId, username: u.username, nickname: u.nickname };
  },

  // 获取用户加入的所有团队
  async getMyTeams(userId: string) {
    const { data: myMembers } = await supabase
      .from("members")
      .select("memberId, teamId, nickname")
      .eq("userId", userId);
    if (!myMembers || myMembers.length === 0) return { teams: [] };
    const teamIds = myMembers.map((m) => m.teamId);
    const { data: teams } = await supabase
      .from("teams")
      .select("*")
      .in("teamId", teamIds);
    // 把 memberId 关联到 team 上
    const memberByTeam = new Map(myMembers.map((m) => [m.teamId, m]));
    return {
      teams: (teams || []).map((t: any) => ({
        ...t,
        myMemberId: memberByTeam.get(t.teamId)?.memberId,
        myNickname: memberByTeam.get(t.teamId)?.nickname,
      })),
    };
  },

  async createTeam(teamName: string, nickname: string, userId: string) {
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
      { memberId, teamId, nickname: nickname.trim(), avatarChar: avatarCharFrom(nickname), joinedAt: now, userId },
    ]);
    if (e2) throw new Error(e2.message);
    return { teamId, memberId, inviteCode };
  },

  async joinTeam(inviteCode: string, nickname: string, userId: string) {
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
      { memberId, teamId: team.teamId, nickname: nickname.trim(), avatarChar: avatarCharFrom(nickname), joinedAt: now, userId },
    ]);
    if (e2) throw new Error(e2.message);
    return { teamId: team.teamId, memberId };
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

  // 队长移除队员：删除该成员的任务关联 + 私信 + 成员记录
  async removeMember(memberId: string) {
    const me = await getMember();
    const { data: team } = await supabase
      .from("teams")
      .select("*")
      .eq("teamId", me.teamId)
      .single();
    if (!team) throw new Error("团队不存在");
    if (team.ownerId !== me.memberId) throw new Error("仅队长可移除队员");
    if (memberId === me.memberId) throw new Error("不能移除自己（队长）");
    const { data: target } = await supabase
      .from("members")
      .select("*")
      .eq("memberId", memberId)
      .single();
    if (!target || target.teamId !== me.teamId) throw new Error("该成员不在本团队");
    // 1. 解除该成员负责的任务的指派（不删除任务，仅清空 assigneeId）
    await supabase
      .from("tasks")
      .update({ assigneeId: null })
      .eq("teamId", me.teamId)
      .eq("assigneeId", memberId);
    // 2. 删除与该成员相关的私信（发送或接收的都删）
    await supabase
      .from("messages")
      .delete()
      .or(`senderId.eq.${memberId},receiverId.eq.${memberId}`)
      .eq("teamId", me.teamId);
    // 3. 删除该成员创建的活动记录的 actorId 关联（保留历史，仅清空 actorId）
    // 为简化，保留活动记录但无法再显示昵称
    // 4. 删除成员记录
    const { error } = await supabase.from("members").delete().eq("memberId", memberId);
    if (error) throw new Error(error.message);
    return { ok: true, nickname: target.nickname };
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

  async getConversation(peerId: string, limit = 50, beforeTimestamp?: number) {
    const member = await getMember();
    const convId = conversationIdOf(member.memberId, peerId);
    let query = supabase
      .from("messages")
      .select("*")
      .eq("conversationId", convId)
      .order("timestamp", { ascending: false })
      .limit(limit);
    if (beforeTimestamp) {
      query = query.lt("timestamp", beforeTimestamp);
    }
    const { data: messages } = await query;
    // 升序返回
    const sorted = (messages || []).slice().reverse();
    return { messages: sorted.map(rowToMessage), hasMore: (messages || []).length >= limit };
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
      { messageId, teamId: member.teamId, conversationId: convId, senderId: member.memberId, receiverId, content: text, kind: "text", timestamp: now, read: false },
    ]);
    if (error) throw new Error(error.message);
    const { data: message } = await supabase.from("messages").select("*").eq("messageId", messageId).single();
    return { message: rowToMessage(message) };
  },

  // 上传图片到 Supabase Storage 并发送图片消息
  async sendImageMessage(receiverId: string, file: File) {
    const member = await getMember();
    if (!receiverId || !file) throw new Error("receiverId 与 file 必填");
    if (file.size > 5 * 1024 * 1024) throw new Error("图片不能超过 5MB");
    if (!file.type.startsWith("image/")) throw new Error("只能发送图片");
    const { data: receiver } = await supabase.from("members").select("*").eq("memberId", receiverId).single();
    if (!receiver || receiver.teamId !== member.teamId) throw new Error("接收方不在同一团队");
    // 上传到 Storage
    const ext = file.name.split(".").pop() || "png";
    const filePath = `${member.teamId}/${conversationIdOf(member.memberId, receiverId)}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("dm-images")
      .upload(filePath, file, { contentType: file.type, upsert: false });
    if (uploadErr) throw new Error("图片上传失败：" + uploadErr.message);
    // 生成公共 URL
    const { data: pub } = supabase.storage.from("dm-images").getPublicUrl(filePath);
    const url = pub.publicUrl;
    const messageId = shortId("d");
    const now = Date.now();
    const convId = conversationIdOf(member.memberId, receiverId);
    const { error } = await supabase.from("messages").insert([
      { messageId, teamId: member.teamId, conversationId: convId, senderId: member.memberId, receiverId, content: url, kind: "image", timestamp: now, read: false },
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
