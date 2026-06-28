import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function avatarCharFrom(nickname: string): string {
  const t = (nickname || "?").trim();
  return t ? Array.from(t)[0]!.toUpperCase() : "?";
}

function conversationIdOf(a: string, b: string): string {
  return [a, b].sort().join(":");
}

function rowToTask(row: any) {
  return {
    ...row,
    tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags ?? "[]"),
    archived: !!row.archived,
  };
}

function rowToMessage(row: any) {
  return { ...row, read: !!row.read };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-member-id",
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function auth(supabase: any, req: Request): Promise<{ member: any; error: Response | null }> {
  const memberId = req.headers.get("x-member-id");
  if (!memberId) {
    return { member: null, error: jsonResponse({ error: "缺少 x-member-id 头" }, 401) };
  }
  const { data: member } = await supabase.from("members").select("*").eq("memberId", memberId).single();
  if (!member) {
    return { member: null, error: jsonResponse({ error: "成员不存在" }, 401) };
  }
  return { member, error: null };
}

async function handleRequest(req: Request) {
  if (req.method === "OPTIONS") {
    return jsonResponse({ ok: true });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  if (method === "POST" && path === "/api/teams") {
    const { teamName, nickname } = await req.json().catch(() => ({ teamName: "", nickname: "" }));
    if (!teamName?.trim() || !nickname?.trim()) {
      return jsonResponse({ error: "teamName 与 nickname 必填" }, 400);
    }
    const teamId = `t_${crypto.randomUUID().slice(0, 10)}`;
    const memberId = `m_${crypto.randomUUID().slice(0, 10)}`;
    const now = Date.now();
    const inviteCode = generateInviteCode();
    await supabase.from("teams").insert([{ teamId, teamName: teamName.trim(), inviteCode, ownerId: memberId, createdAt: now }]);
    await supabase.from("members").insert([{ memberId, teamId, nickname: nickname.trim(), avatarChar: avatarCharFrom(nickname), joinedAt: now }]);
    return jsonResponse({ teamId, memberId, inviteCode }, 201);
  }

  if (method === "POST" && path === "/api/teams/join") {
    const { inviteCode, nickname } = await req.json().catch(() => ({ inviteCode: "", nickname: "" }));
    if (!inviteCode?.trim() || !nickname?.trim()) {
      return jsonResponse({ error: "inviteCode 与 nickname 必填" }, 400);
    }
    const { data: team } = await supabase.from("teams").select("*").eq("inviteCode", inviteCode.trim().toUpperCase()).single();
    if (!team) {
      return jsonResponse({ error: "邀请码无效" }, 404);
    }
    const memberId = `m_${crypto.randomUUID().slice(0, 10)}`;
    const now = Date.now();
    await supabase.from("members").insert([{ memberId, teamId: team.teamId, nickname: nickname.trim(), avatarChar: avatarCharFrom(nickname), joinedAt: now }]);
    return jsonResponse({ teamId: team.teamId, memberId }, 201);
  }

  if (method === "GET" && path.startsWith("/api/teams/")) {
    const { member, error } = await auth(supabase, req);
    if (error) return error;
    const teamId = path.split("/")[3];
    const { data: team } = await supabase.from("teams").select("*").eq("teamId", teamId).single();
    if (!team) return jsonResponse({ error: "团队不存在" }, 404);
    if (member.teamId !== team.teamId) {
      return jsonResponse({ error: "无权访问该团队" }, 403);
    }
    const { data: members } = await supabase.from("members").select("*").eq("teamId", team.teamId).order("joinedAt");
    return jsonResponse({ team, members });
  }

  if (method === "PATCH" && path.startsWith("/api/teams/")) {
    const { member, error } = await auth(supabase, req);
    if (error) return error;
    const teamId = path.split("/")[3];
    const { data: team } = await supabase.from("teams").select("*").eq("teamId", teamId).single();
    if (!team) return jsonResponse({ error: "团队不存在" }, 404);
    if (team.ownerId !== member.memberId) {
      return jsonResponse({ error: "仅所有者可重命名" }, 403);
    }
    const { teamName } = await req.json().catch(() => ({ teamName: "" }));
    const name = teamName?.trim();
    if (!name) return jsonResponse({ error: "团队名不能为空" }, 400);
    await supabase.from("teams").update({ teamName: name }).eq("teamId", team.teamId);
    return jsonResponse({ ok: true });
  }

  if (method === "PATCH" && path.startsWith("/api/members/")) {
    const { member, error } = await auth(supabase, req);
    if (error) return error;
    const memberId = path.split("/")[3];
    if (memberId !== member.memberId) {
      return jsonResponse({ error: "只能修改自己的昵称" }, 403);
    }
    const { nickname } = await req.json().catch(() => ({ nickname: "" }));
    const nick = nickname?.trim();
    if (!nick) return jsonResponse({ error: "昵称不能为空" }, 400);
    await supabase.from("members").update({ nickname: nick, avatarChar: avatarCharFrom(nick) }).eq("memberId", member.memberId);
    return jsonResponse({ ok: true });
  }

  if (method === "GET" && path.startsWith("/api/teams/") && path.includes("/tasks")) {
    const { member, error } = await auth(supabase, req);
    if (error) return error;
    const parts = path.split("/");
    const teamId = parts[3];
    if (member.teamId !== teamId) {
      return jsonResponse({ error: "无权访问" }, 403);
    }
    const { data: tasks } = await supabase.from("tasks").select("*").eq("teamId", teamId).order("createdAt");
    const { data: activities } = await supabase.from("activities").select("*").eq("taskId", "IN", (tasks || []).map((t: any) => t.taskId));
    const { data: notes } = await supabase.from("notes").select("*").eq("taskId", "IN", (tasks || []).map((t: any) => t.taskId));
    return jsonResponse({
      tasks: (tasks || []).map(rowToTask),
      activities: activities || [],
      notes: notes || [],
    });
  }

  if (method === "POST" && path === "/api/tasks") {
    const { member, error } = await auth(supabase, req);
    if (error) return error;
    const body = await req.json().catch(() => ({ title: "", description: "", assigneeId: null, priority: "medium", dueDate: null, tags: [] }));
    const { title, description = "", assigneeId = null, priority = "medium", dueDate = null, tags = [] } = body;
    if (!title?.trim()) {
      return jsonResponse({ error: "title 必填" }, 400);
    }
    const taskId = `k_${crypto.randomUUID().slice(0, 10)}`;
    const now = Date.now();
    await supabase.from("tasks").insert([{
      taskId,
      teamId: member.teamId,
      title: title.trim(),
      description: description.trim(),
      assigneeId,
      status: "todo",
      priority,
      dueDate,
      tags: JSON.stringify(tags),
      progress: 0,
      createdAt: now,
      updatedAt: now,
      archived: false,
    }]);
    const activityId = `a_${crypto.randomUUID().slice(0, 10)}`;
    await supabase.from("activities").insert([{ activityId, taskId, actorId: member.memberId, type: "created", payload: JSON.stringify({ title: title.trim() }), timestamp: now }]);
    const { data: task } = await supabase.from("tasks").select("*").eq("taskId", taskId).single();
    const { data: activity } = await supabase.from("activities").select("*").eq("activityId", activityId).single();
    return jsonResponse({ task: rowToTask(task), activity }, 201);
  }

  if (method === "PATCH" && path.startsWith("/api/tasks/")) {
    const { member, error } = await auth(supabase, req);
    if (error) return error;
    const taskId = path.split("/")[3];
    const { data: task } = await supabase.from("tasks").select("*").eq("taskId", taskId).single();
    if (!task) return jsonResponse({ error: "任务不存在" }, 404);
    if (task.teamId !== member.teamId) {
      return jsonResponse({ error: "无权访问" }, 403);
    }
    const body = await req.json().catch(() => ({}));
    const allowed = ["title", "description", "assigneeId", "status", "priority", "dueDate", "tags", "progress", "archived"];
    const patch: Record<string, any> = {};
    for (const k of allowed) {
      if (k in body) patch[k] = body[k];
    }
    if (patch.tags) patch.tags = JSON.stringify(patch.tags);
    const now = Date.now();
    patch.updatedAt = now;
    await supabase.from("tasks").update(patch).eq("taskId", task.taskId);
    const activityId = `a_${crypto.randomUUID().slice(0, 10)}`;
    await supabase.from("activities").insert([{ activityId, taskId: task.taskId, actorId: member.memberId, type: "edited", payload: JSON.stringify(patch), timestamp: now }]);
    const { data: updated } = await supabase.from("tasks").select("*").eq("taskId", taskId).single();
    const { data: activity } = await supabase.from("activities").select("*").eq("activityId", activityId).single();
    return jsonResponse({ task: rowToTask(updated), activity });
  }

  if (method === "POST" && path.includes("/status")) {
    const { member, error } = await auth(supabase, req);
    if (error) return error;
    const parts = path.split("/");
    const taskId = parts[3];
    const { data: task } = await supabase.from("tasks").select("*").eq("taskId", taskId).single();
    if (!task) return jsonResponse({ error: "任务不存在" }, 404);
    if (task.teamId !== member.teamId) {
      return jsonResponse({ error: "无权访问" }, 403);
    }
    const { status } = await req.json().catch(() => ({ status: "" }));
    if (!["todo", "in_progress", "done"].includes(status)) {
      return jsonResponse({ error: "非法状态" }, 400);
    }
    if (task.status === status) return jsonResponse({ task: rowToTask(task) });
    let progress = task.progress;
    if (status === "done") progress = 100;
    else if (status === "todo") progress = 0;
    else if (status === "in_progress" && progress === 0) progress = 10;
    const now = Date.now();
    await supabase.from("tasks").update({ status, progress, updatedAt: now }).eq("taskId", task.taskId);
    const activityId = `a_${crypto.randomUUID().slice(0, 10)}`;
    await supabase.from("activities").insert([{ activityId, taskId, actorId: member.memberId, type: status === "done" ? "completed" : "status_changed", payload: JSON.stringify({ from: task.status, to: status, progress }), timestamp: now }]);
    const { data: updated } = await supabase.from("tasks").select("*").eq("taskId", taskId).single();
    const { data: activity } = await supabase.from("activities").select("*").eq("activityId", activityId).single();
    return jsonResponse({ task: rowToTask(updated), activity });
  }

  if (method === "POST" && path.includes("/progress")) {
    const { member, error } = await auth(supabase, req);
    if (error) return error;
    const parts = path.split("/");
    const taskId = parts[3];
    const { data: task } = await supabase.from("tasks").select("*").eq("taskId", taskId).single();
    if (!task) return jsonResponse({ error: "任务不存在" }, 404);
    if (task.teamId !== member.teamId) {
      return jsonResponse({ error: "无权访问" }, 403);
    }
    const { progress: newProgress } = await req.json().catch(() => ({ progress: 0 }));
    let progress = Math.max(0, Math.min(100, Math.round(newProgress ?? 0)));
    let status = task.status;
    if (progress >= 100 && status !== "done") status = "done";
    else if (progress > 0 && progress < 100 && status === "todo") status = "in_progress";
    else if (progress < 100 && status === "done") status = "in_progress";
    const now = Date.now();
    await supabase.from("tasks").update({ progress, status, updatedAt: now }).eq("taskId", task.taskId);
    const activityId = `a_${crypto.randomUUID().slice(0, 10)}`;
    await supabase.from("activities").insert([{ activityId, taskId, actorId: member.memberId, type: status !== task.status ? (status === "done" ? "completed" : "status_changed") : "edited", payload: JSON.stringify({ from: task.status, to: status, progress }), timestamp: now }]);
    const { data: updated } = await supabase.from("tasks").select("*").eq("taskId", taskId).single();
    const { data: activity } = await supabase.from("activities").select("*").eq("activityId", activityId).single();
    return jsonResponse({ task: rowToTask(updated), activity });
  }

  if (method === "DELETE" && path.startsWith("/api/tasks/")) {
    const { member, error } = await auth(supabase, req);
    if (error) return error;
    const taskId = path.split("/")[3];
    const { data: task } = await supabase.from("tasks").select("*").eq("taskId", taskId).single();
    if (!task) return jsonResponse({ error: "任务不存在" }, 404);
    if (task.teamId !== member.teamId) {
      return jsonResponse({ error: "无权访问" }, 403);
    }
    await supabase.from("tasks").delete().eq("taskId", task.taskId);
    return jsonResponse({ ok: true });
  }

  if (method === "POST" && path.includes("/notes")) {
    const { member, error } = await auth(supabase, req);
    if (error) return error;
    const parts = path.split("/");
    const taskId = parts[3];
    const { data: task } = await supabase.from("tasks").select("*").eq("taskId", taskId).single();
    if (!task) return jsonResponse({ error: "任务不存在" }, 404);
    if (task.teamId !== member.teamId) {
      return jsonResponse({ error: "无权访问" }, 403);
    }
    const { content } = await req.json().catch(() => ({ content: "" }));
    const text = content?.trim();
    if (!text) return jsonResponse({ error: "内容不能为空" }, 400);
    const noteId = `n_${crypto.randomUUID().slice(0, 10)}`;
    const now = Date.now();
    await supabase.from("notes").insert([{ noteId, taskId, authorId: member.memberId, content: text, timestamp: now }]);
    const activityId = `a_${crypto.randomUUID().slice(0, 10)}`;
    await supabase.from("activities").insert([{ activityId, taskId, actorId: member.memberId, type: "note_added", payload: JSON.stringify({ content: text }), timestamp: now }]);
    const { data: note } = await supabase.from("notes").select("*").eq("noteId", noteId).single();
    const { data: activity } = await supabase.from("activities").select("*").eq("activityId", activityId).single();
    return jsonResponse({ note, activity }, 201);
  }

  if (method === "GET" && path === "/api/messages") {
    const { member, error } = await auth(supabase, req);
    if (error) return error;
    const me = member.memberId;
    const { data: rows } = await supabase.from("messages").select("*").eq("teamId", member.teamId).or(`senderId.eq.${me},receiverId.eq.${me}`).order("timestamp", { ascending: false });
    const convMap = new Map();
    for (const m of rows || []) {
      const peerId = m.senderId === me ? m.receiverId : m.senderId;
      if (!convMap.has(peerId)) {
        convMap.set(peerId, { peerId, lastMessage: rowToMessage(m), unread: 0 });
      }
    }
    for (const [peerId] of convMap) {
      const { data: count } = await supabase.from("messages").select("count", { count: "exact" }).eq("conversationId", conversationIdOf(me, peerId)).eq("receiverId", me).eq("read", false);
      convMap.get(peerId).unread = count?.length ? count[0].count : 0;
    }
    return jsonResponse({ conversations: Array.from(convMap.values()) });
  }

  if (method === "GET" && path.startsWith("/api/messages/")) {
    const { member, error } = await auth(supabase, req);
    if (error) return error;
    const peerId = path.split("/")[3];
    const convId = conversationIdOf(member.memberId, peerId);
    const { data: messages } = await supabase.from("messages").select("*").eq("conversationId", convId).order("timestamp");
    return jsonResponse({ messages: (messages || []).map(rowToMessage) });
  }

  if (method === "POST" && path === "/api/messages") {
    const { member, error } = await auth(supabase, req);
    if (error) return error;
    const { receiverId, content } = await req.json().catch(() => ({ receiverId: "", content: "" }));
    const text = content?.trim();
    if (!receiverId || !text) {
      return jsonResponse({ error: "receiverId 与 content 必填" }, 400);
    }
    const { data: receiver } = await supabase.from("members").select("*").eq("memberId", receiverId).single();
    if (!receiver || receiver.teamId !== member.teamId) {
      return jsonResponse({ error: "接收方不在同一团队" }, 400);
    }
    const messageId = `d_${crypto.randomUUID().slice(0, 10)}`;
    const now = Date.now();
    const convId = conversationIdOf(member.memberId, receiverId);
    await supabase.from("messages").insert([{ messageId, teamId: member.teamId, conversationId: convId, senderId: member.memberId, receiverId, content: text, timestamp: now, read: false }]);
    const { data: message } = await supabase.from("messages").select("*").eq("messageId", messageId).single();
    return jsonResponse({ message: rowToMessage(message) }, 201);
  }

  if (method === "POST" && path.includes("/read")) {
    const { member, error } = await auth(supabase, req);
    if (error) return error;
    const parts = path.split("/");
    const peerId = parts[3];
    const convId = conversationIdOf(member.memberId, peerId);
    await supabase.from("messages").update({ read: true }).eq("conversationId", convId).eq("receiverId", member.memberId).eq("read", false);
    return jsonResponse({ ok: true });
  }

  if (method === "GET" && path.includes("/export")) {
    const { member, error } = await auth(supabase, req);
    if (error) return error;
    const parts = path.split("/");
    const teamId = parts[3];
    if (member.teamId !== teamId) {
      return jsonResponse({ error: "无权访问" }, 403);
    }
    const { data: team } = await supabase.from("teams").select("*").eq("teamId", teamId).single();
    const { data: members } = await supabase.from("members").select("*").eq("teamId", teamId);
    const { data: tasks } = await supabase.from("tasks").select("*").eq("teamId", teamId);
    const { data: activities } = await supabase.from("activities").select("*").eq("taskId", "IN", (tasks || []).map((t: any) => t.taskId));
    const { data: notes } = await supabase.from("notes").select("*").eq("taskId", "IN", (tasks || []).map((t: any) => t.taskId));
    const { data: messages } = await supabase.from("messages").select("*").eq("teamId", teamId);
    return jsonResponse({
      team,
      members,
      tasks: (tasks || []).map(rowToTask),
      activities: activities || [],
      notes: notes || [],
      messages: (messages || []).map(rowToMessage),
      exportedAt: new Date().toISOString(),
    });
  }

  if (method === "GET" && path === "/api/health") {
    return jsonResponse({ ok: true, ts: Date.now() });
  }

  return jsonResponse({ error: "Not found" }, 404);
}

serve(handleRequest);
