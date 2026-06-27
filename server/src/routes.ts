// REST API 路由：团队 / 成员 / 任务 / 活动 / 备注 / 私信
import { Router } from "express";
import { nanoid } from "nanoid";
import { pool, rowToTask, rowToMessage } from "./db.js";
import { broadcastToTeam } from "./realtime.js";
import type { TaskStatus } from "./types.js";

export const router = Router();

// 简单鉴权中间件：从 header x-member-id 取当前成员
async function auth(req: any, res: any, next: any) {
  const memberId = req.header("x-member-id");
  if (!memberId) {
    return res.status(401).json({ error: "缺少 x-member-id 头" });
  }
  const { rows } = await pool.query(
    "SELECT * FROM members WHERE memberId = $1",
    [memberId],
  );
  const member = rows[0];
  if (!member) {
    return res.status(401).json({ error: "成员不存在" });
  }
  req.member = member;
  next();
}

// 工具：生成 6 位邀请码（去除易混淆字符）
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

// 工具：取昵称首字
function avatarCharFrom(nickname: string): string {
  const t = (nickname || "?").trim();
  return t ? Array.from(t)[0]!.toUpperCase() : "?";
}

// 工具：构造 conversationId
function conversationIdOf(a: string, b: string): string {
  return [a, b].sort().join(":");
}

// ── 团队 / 成员 ──

// 创建团队
router.post("/teams", async (req, res) => {
  const { teamName, nickname } = req.body ?? {};
  if (!teamName?.trim() || !nickname?.trim()) {
    return res.status(400).json({ error: "teamName 与 nickname 必填" });
  }
  const teamId = `t_${nanoid(10)}`;
  const memberId = `m_${nanoid(10)}`;
  const now = Date.now();
  const inviteCode = generateInviteCode();
  await pool.query(
    `INSERT INTO teams (teamId, teamName, inviteCode, ownerId, createdAt)
     VALUES ($1, $2, $3, $4, $5)`,
    [teamId, teamName.trim(), inviteCode, memberId, now],
  );
  await pool.query(
    `INSERT INTO members (memberId, teamId, nickname, avatarChar, joinedAt)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      memberId,
      teamId,
      nickname.trim(),
      avatarCharFrom(nickname),
      now,
    ],
  );
  res.status(201).json({ teamId, memberId, inviteCode });
  // 新团队，暂无其他订阅者，但保持一致
  const { rows: teamRows } = await pool.query(
    "SELECT * FROM teams WHERE teamId = $1",
    [teamId],
  );
  const { rows: memberRows } = await pool.query(
    "SELECT * FROM members WHERE memberId = $1",
    [memberId],
  );
  broadcastToTeam(teamId, {
    type: "team:created",
    teamId,
    team: teamRows[0],
    member: memberRows[0],
  });
});

// 按邀请码加入团队
router.post("/teams/join", async (req, res) => {
  const { inviteCode, nickname } = req.body ?? {};
  if (!inviteCode?.trim() || !nickname?.trim()) {
    return res.status(400).json({ error: "inviteCode 与 nickname 必填" });
  }
  const { rows: teamRows } = await pool.query(
    "SELECT * FROM teams WHERE inviteCode = $1",
    [inviteCode.trim().toUpperCase()],
  );
  const team = teamRows[0] as any;
  if (!team) {
    return res.status(404).json({ error: "邀请码无效" });
  }
  const memberId = `m_${nanoid(10)}`;
  const now = Date.now();
  await pool.query(
    `INSERT INTO members (memberId, teamId, nickname, avatarChar, joinedAt)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      memberId,
      team.teamId,
      nickname.trim(),
      avatarCharFrom(nickname),
      now,
    ],
  );
  res.status(201).json({ teamId: team.teamId, memberId });
  // 有新成员加入，通知同团队其他成员刷新成员列表
  const { rows: memberRows } = await pool.query(
    "SELECT * FROM members WHERE memberId = $1",
    [memberId],
  );
  broadcastToTeam(team.teamId, {
    type: "member:joined",
    teamId: team.teamId,
    member: memberRows[0],
  });
});

// 获取团队信息 + 全部成员
router.get("/teams/:teamId", auth, async (req: any, res) => {
  const { rows: teamRows } = await pool.query(
    "SELECT * FROM teams WHERE teamId = $1",
    [req.params.teamId],
  );
  const team = teamRows[0] as any;
  if (!team) return res.status(404).json({ error: "团队不存在" });
  if (req.member.teamId !== team.teamId) {
    return res.status(403).json({ error: "无权访问该团队" });
  }
  const { rows: members } = await pool.query(
    "SELECT * FROM members WHERE teamId = $1 ORDER BY joinedAt",
    [team.teamId],
  );
  res.json({ team, members });
});

// 修改昵称
router.patch("/members/:memberId", auth, async (req: any, res) => {
  if (req.params.memberId !== req.member.memberId) {
    return res.status(403).json({ error: "只能修改自己的昵称" });
  }
  const nickname = (req.body?.nickname ?? "").trim();
  if (!nickname) return res.status(400).json({ error: "昵称不能为空" });
  await pool.query(
    "UPDATE members SET nickname = $1, avatarChar = $2 WHERE memberId = $3",
    [nickname, avatarCharFrom(nickname), req.member.memberId],
  );
  res.json({ ok: true });
  const { rows } = await pool.query(
    "SELECT * FROM members WHERE memberId = $1",
    [req.member.memberId],
  );
  broadcastToTeam(req.member.teamId, {
    type: "member:updated",
    teamId: req.member.teamId,
    member: rows[0],
  });
});

// 重命名团队（仅 owner）
router.patch("/teams/:teamId", auth, async (req: any, res) => {
  const { rows: teamRows } = await pool.query(
    "SELECT * FROM teams WHERE teamId = $1",
    [req.params.teamId],
  );
  const team = teamRows[0] as any;
  if (!team) return res.status(404).json({ error: "团队不存在" });
  if (team.ownerId !== req.member.memberId) {
    return res.status(403).json({ error: "仅所有者可重命名" });
  }
  const name = (req.body?.teamName ?? "").trim();
  if (!name) return res.status(400).json({ error: "团队名不能为空" });
  await pool.query("UPDATE teams SET teamName = $1 WHERE teamId = $2", [
    name,
    team.teamId,
  ]);
  res.json({ ok: true });
  const { rows } = await pool.query(
    "SELECT * FROM teams WHERE teamId = $1",
    [team.teamId],
  );
  broadcastToTeam(team.teamId, {
    type: "team:renamed",
    teamId: team.teamId,
    team: rows[0],
  });
});

// ── 任务 ──

// 拉取团队下全部任务（含活动、备注）
router.get("/teams/:teamId/tasks", auth, async (req: any, res) => {
  if (req.member.teamId !== req.params.teamId) {
    return res.status(403).json({ error: "无权访问" });
  }
  const { rows: taskRows } = await pool.query(
    "SELECT * FROM tasks WHERE teamId = $1 ORDER BY createdAt",
    [req.params.teamId],
  );
  const tasks = taskRows.map(rowToTask);
  const { rows: activities } = await pool.query(
    `SELECT a.* FROM activities a
     JOIN tasks t ON a.taskId = t.taskId
     WHERE t.teamId = $1`,
    [req.params.teamId],
  );
  const { rows: notes } = await pool.query(
    `SELECT n.* FROM notes n
     JOIN tasks t ON n.taskId = t.taskId
     WHERE t.teamId = $1`,
    [req.params.teamId],
  );
  res.json({ tasks, activities, notes });
});

// 创建任务
router.post("/tasks", auth, async (req: any, res) => {
  const {
    title,
    description = "",
    assigneeId = null,
    priority = "medium",
    dueDate = null,
    tags = [],
  } = req.body ?? {};
  if (!title?.trim()) {
    return res.status(400).json({ error: "title 必填" });
  }
  const taskId = `k_${nanoid(10)}`;
  const now = Date.now();
  await pool.query(
    `INSERT INTO tasks
     (taskId, teamId, title, description, assigneeId, status, priority, dueDate, tags, progress, createdAt, updatedAt, archived)
     VALUES ($1, $2, $3, $4, $5, 'todo', $6, $7, $8, 0, $9, $10, false)`,
    [
      taskId,
      req.member.teamId,
      title.trim(),
      description.trim(),
      assigneeId,
      priority,
      dueDate,
      JSON.stringify(tags),
      now,
      now,
    ],
  );
  // 记录创建活动
  const activityId = `a_${nanoid(10)}`;
  await pool.query(
    `INSERT INTO activities (activityId, taskId, actorId, type, payload, timestamp)
     VALUES ($1, $2, $3, 'created', $4, $5)`,
    [
      activityId,
      taskId,
      req.member.memberId,
      JSON.stringify({ title: title.trim() }),
      now,
    ],
  );
  const { rows: taskRows } = await pool.query(
    "SELECT * FROM tasks WHERE taskId = $1",
    [taskId],
  );
  const { rows: actRows } = await pool.query(
    "SELECT * FROM activities WHERE activityId = $1",
    [activityId],
  );
  const task = rowToTask(taskRows[0]);
  res.status(201).json({ task, activity: actRows[0] });
  broadcastToTeam(req.member.teamId, {
    type: "task:created",
    teamId: req.member.teamId,
    task,
    activity: actRows[0],
  });
});

// 更新任务
router.patch("/tasks/:taskId", auth, async (req: any, res) => {
  const { rows: taskRows } = await pool.query(
    "SELECT * FROM tasks WHERE taskId = $1",
    [req.params.taskId],
  );
  const task = taskRows[0] as any;
  if (!task) return res.status(404).json({ error: "任务不存在" });
  if (task.teamId !== req.member.teamId) {
    return res.status(403).json({ error: "无权访问" });
  }
  const allowed = [
    "title",
    "description",
    "assigneeId",
    "status",
    "priority",
    "dueDate",
    "tags",
    "progress",
    "archived",
  ];
  const patch: Record<string, any> = {};
  for (const k of allowed) {
    if (k in (req.body ?? {})) patch[k] = req.body[k];
  }
  if (patch.tags) patch.tags = JSON.stringify(patch.tags);
  if (patch.archived !== undefined) patch.archived = patch.archived ? true : false;
  const now = Date.now();
  patch.updatedAt = now;

  // 动态构造 SET 子句：用 $1, $2, ... 位置占位符
  const keys = Object.keys(patch);
  const sets = keys.map((k, i) => `${k} = $${i + 1}`);
  const values = keys.map((k) => patch[k]);
  values.push(task.taskId); // WHERE taskId = $N
  await pool.query(
    `UPDATE tasks SET ${sets.join(", ")} WHERE taskId = $${keys.length + 1}`,
    values,
  );

  // 记录编辑活动
  const activityId = `a_${nanoid(10)}`;
  const cleanPatch = { ...patch };
  if (cleanPatch.tags) cleanPatch.tags = JSON.parse(cleanPatch.tags);
  if (cleanPatch.archived !== undefined)
    cleanPatch.archived = !!cleanPatch.archived;
  await pool.query(
    `INSERT INTO activities (activityId, taskId, actorId, type, payload, timestamp)
     VALUES ($1, $2, $3, 'edited', $4, $5)`,
    [
      activityId,
      task.taskId,
      req.member.memberId,
      JSON.stringify(cleanPatch),
      now,
    ],
  );

  const { rows: updatedRows } = await pool.query(
    "SELECT * FROM tasks WHERE taskId = $1",
    [task.taskId],
  );
  const { rows: actRows } = await pool.query(
    "SELECT * FROM activities WHERE activityId = $1",
    [activityId],
  );
  const updated = rowToTask(updatedRows[0]);
  res.json({
    task: updated,
    activity: actRows[0],
  });
  broadcastToTeam(req.member.teamId, {
    type: "task:updated",
    teamId: req.member.teamId,
    task: updated,
    activity: actRows[0],
  });
});

// 设置状态（联动进度 + 活动记录）
router.post("/tasks/:taskId/status", auth, async (req: any, res) => {
  const { rows: taskRows } = await pool.query(
    "SELECT * FROM tasks WHERE taskId = $1",
    [req.params.taskId],
  );
  const task = taskRows[0] as any;
  if (!task) return res.status(404).json({ error: "任务不存在" });
  if (task.teamId !== req.member.teamId) {
    return res.status(403).json({ error: "无权访问" });
  }
  const status = req.body?.status as TaskStatus;
  if (!["todo", "in_progress", "done"].includes(status)) {
    return res.status(400).json({ error: "非法状态" });
  }
  if (task.status === status) return res.json({ task: rowToTask(task) });

  // 联动进度
  let progress = task.progress;
  if (status === "done") progress = 100;
  else if (status === "todo") progress = 0;
  else if (status === "in_progress" && progress === 0) progress = 10;

  const now = Date.now();
  await pool.query(
    "UPDATE tasks SET status = $1, progress = $2, updatedAt = $3 WHERE taskId = $4",
    [status, progress, now, task.taskId],
  );

  const activityId = `a_${nanoid(10)}`;
  await pool.query(
    `INSERT INTO activities (activityId, taskId, actorId, type, payload, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      activityId,
      task.taskId,
      req.member.memberId,
      status === "done" ? "completed" : "status_changed",
      JSON.stringify({ from: task.status, to: status, progress }),
      now,
    ],
  );
  const { rows: updatedRows } = await pool.query(
    "SELECT * FROM tasks WHERE taskId = $1",
    [task.taskId],
  );
  const { rows: actRows } = await pool.query(
    "SELECT * FROM activities WHERE activityId = $1",
    [activityId],
  );
  const updated = rowToTask(updatedRows[0]);
  res.json({
    task: updated,
    activity: actRows[0],
  });
  broadcastToTeam(req.member.teamId, {
    type: "task:updated",
    teamId: req.member.teamId,
    task: updated,
    activity: actRows[0],
  });
});

// 设置进度（联动状态）
router.post("/tasks/:taskId/progress", auth, async (req: any, res) => {
  const { rows: taskRows } = await pool.query(
    "SELECT * FROM tasks WHERE taskId = $1",
    [req.params.taskId],
  );
  const task = taskRows[0] as any;
  if (!task) return res.status(404).json({ error: "任务不存在" });
  if (task.teamId !== req.member.teamId) {
    return res.status(403).json({ error: "无权访问" });
  }
  let progress = Math.max(0, Math.min(100, Math.round(req.body?.progress ?? 0)));
  let status: TaskStatus = task.status;
  if (progress >= 100 && status !== "done") status = "done";
  else if (progress > 0 && progress < 100 && status === "todo")
    status = "in_progress";
  else if (progress < 100 && status === "done") status = "in_progress";

  const now = Date.now();
  await pool.query(
    "UPDATE tasks SET progress = $1, status = $2, updatedAt = $3 WHERE taskId = $4",
    [progress, status, now, task.taskId],
  );

  const activityId = `a_${nanoid(10)}`;
  await pool.query(
    `INSERT INTO activities (activityId, taskId, actorId, type, payload, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      activityId,
      task.taskId,
      req.member.memberId,
      status !== task.status
        ? status === "done"
          ? "completed"
          : "status_changed"
        : "edited",
      JSON.stringify({ from: task.status, to: status, progress }),
      now,
    ],
  );
  const { rows: updatedRows } = await pool.query(
    "SELECT * FROM tasks WHERE taskId = $1",
    [task.taskId],
  );
  const { rows: actRows } = await pool.query(
    "SELECT * FROM activities WHERE activityId = $1",
    [activityId],
  );
  const updated = rowToTask(updatedRows[0]);
  res.json({
    task: updated,
    activity: actRows[0],
  });
  broadcastToTeam(req.member.teamId, {
    type: "task:updated",
    teamId: req.member.teamId,
    task: updated,
    activity: actRows[0],
  });
});

// 删除任务（级联删除活动、备注）
router.delete("/tasks/:taskId", auth, async (req: any, res) => {
  const { rows: taskRows } = await pool.query(
    "SELECT * FROM tasks WHERE taskId = $1",
    [req.params.taskId],
  );
  const task = taskRows[0] as any;
  if (!task) return res.status(404).json({ error: "任务不存在" });
  if (task.teamId !== req.member.teamId) {
    return res.status(403).json({ error: "无权访问" });
  }
  await pool.query("DELETE FROM tasks WHERE taskId = $1", [task.taskId]);
  res.json({ ok: true });
  broadcastToTeam(req.member.teamId, {
    type: "task:deleted",
    teamId: req.member.teamId,
    taskId: task.taskId,
  });
});

// ── 备注 ──

router.post("/tasks/:taskId/notes", auth, async (req: any, res) => {
  const { rows: taskRows } = await pool.query(
    "SELECT * FROM tasks WHERE taskId = $1",
    [req.params.taskId],
  );
  const task = taskRows[0] as any;
  if (!task) return res.status(404).json({ error: "任务不存在" });
  if (task.teamId !== req.member.teamId) {
    return res.status(403).json({ error: "无权访问" });
  }
  const content = (req.body?.content ?? "").trim();
  if (!content) return res.status(400).json({ error: "内容不能为空" });
  const noteId = `n_${nanoid(10)}`;
  const now = Date.now();
  await pool.query(
    `INSERT INTO notes (noteId, taskId, authorId, content, timestamp)
     VALUES ($1, $2, $3, $4, $5)`,
    [noteId, task.taskId, req.member.memberId, content, now],
  );

  const activityId = `a_${nanoid(10)}`;
  await pool.query(
    `INSERT INTO activities (activityId, taskId, actorId, type, payload, timestamp)
     VALUES ($1, $2, $3, 'note_added', $4, $5)`,
    [
      activityId,
      task.taskId,
      req.member.memberId,
      JSON.stringify({ content }),
      now,
    ],
  );
  const { rows: noteRows } = await pool.query(
    "SELECT * FROM notes WHERE noteId = $1",
    [noteId],
  );
  const { rows: actRows } = await pool.query(
    "SELECT * FROM activities WHERE activityId = $1",
    [activityId],
  );
  const note = noteRows[0];
  res.status(201).json({
    note,
    activity: actRows[0],
  });
  broadcastToTeam(req.member.teamId, {
    type: "note:added",
    teamId: req.member.teamId,
    note,
    activity: actRows[0],
  });
});

// ── 私信 ──

// 拉取与某 peer 的全部消息
router.get("/messages/:peerId", auth, async (req: any, res) => {
  const convId = conversationIdOf(req.member.memberId, req.params.peerId);
  const { rows: msgRows } = await pool.query(
    "SELECT * FROM messages WHERE conversationId = $1 ORDER BY timestamp",
    [convId],
  );
  const messages = msgRows.map(rowToMessage);
  res.json({ messages });
});

// 拉取团队下当前成员参与的会话列表（含未读数）
router.get("/messages", auth, async (req: any, res) => {
  const me = req.member.memberId;
  const { rows } = await pool.query(
    `SELECT * FROM messages
     WHERE teamId = $1 AND (senderId = $2 OR receiverId = $3)
     ORDER BY timestamp DESC`,
    [req.member.teamId, me, me],
  );
  // 聚合成会话
  const convMap = new Map();
  for (const m of rows) {
    const peerId = m.senderId === me ? m.receiverId : m.senderId;
    if (!convMap.has(peerId)) {
      convMap.set(peerId, {
        peerId,
        lastMessage: rowToMessage(m),
        unread: 0,
      });
    }
  }
  for (const [peerId, conv] of convMap) {
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM messages
       WHERE conversationId = $1 AND receiverId = $2 AND read = false`,
      [conversationIdOf(me, peerId), me],
    );
    conv.unread = countRows[0].c;
  }
  res.json({ conversations: Array.from(convMap.values()) });
});

// 发送私信
router.post("/messages", auth, async (req: any, res) => {
  const { receiverId, content } = req.body ?? {};
  const text = (content ?? "").trim();
  if (!receiverId || !text) {
    return res.status(400).json({ error: "receiverId 与 content 必填" });
  }
  const { rows: recvRows } = await pool.query(
    "SELECT * FROM members WHERE memberId = $1",
    [receiverId],
  );
  const receiver = recvRows[0] as any;
  if (!receiver || receiver.teamId !== req.member.teamId) {
    return res.status(400).json({ error: "接收方不在同一团队" });
  }
  const messageId = `d_${nanoid(10)}`;
  const now = Date.now();
  const convId = conversationIdOf(req.member.memberId, receiverId);
  await pool.query(
    `INSERT INTO messages (messageId, teamId, conversationId, senderId, receiverId, content, timestamp, read)
     VALUES ($1, $2, $3, $4, $5, $6, $7, false)`,
    [
      messageId,
      req.member.teamId,
      convId,
      req.member.memberId,
      receiverId,
      text,
      now,
    ],
  );
  const { rows: msgRows } = await pool.query(
    "SELECT * FROM messages WHERE messageId = $1",
    [messageId],
  );
  const message = rowToMessage(msgRows[0]);
  res.status(201).json({ message });
  // 私信广播到团队频道，客户端根据 receiverId 判断是否为自己
  broadcastToTeam(req.member.teamId, {
    type: "message:sent",
    teamId: req.member.teamId,
    message,
  });
});

// 标记与某 peer 的会话为已读
router.post("/messages/:peerId/read", auth, async (req: any, res) => {
  const convId = conversationIdOf(req.member.memberId, req.params.peerId);
  await pool.query(
    `UPDATE messages SET read = true
     WHERE conversationId = $1 AND receiverId = $2 AND read = false`,
    [convId, req.member.memberId],
  );
  res.json({ ok: true });
  broadcastToTeam(req.member.teamId, {
    type: "message:read",
    teamId: req.member.teamId,
    conversationId: convId,
    readerId: req.member.memberId,
    peerId: req.params.peerId,
  });
});

// ── 数据导出 / 导入 ──

router.get("/teams/:teamId/export", auth, async (req: any, res) => {
  if (req.member.teamId !== req.params.teamId) {
    return res.status(403).json({ error: "无权访问" });
  }
  const { rows: teamRows } = await pool.query(
    "SELECT * FROM teams WHERE teamId = $1",
    [req.params.teamId],
  );
  const { rows: members } = await pool.query(
    "SELECT * FROM members WHERE teamId = $1",
    [req.params.teamId],
  );
  const { rows: taskRows } = await pool.query(
    "SELECT * FROM tasks WHERE teamId = $1",
    [req.params.teamId],
  );
  const tasks = taskRows.map(rowToTask);
  const { rows: activities } = await pool.query(
    `SELECT a.* FROM activities a JOIN tasks t ON a.taskId = t.taskId WHERE t.teamId = $1`,
    [req.params.teamId],
  );
  const { rows: notes } = await pool.query(
    `SELECT n.* FROM notes n JOIN tasks t ON n.taskId = t.taskId WHERE t.teamId = $1`,
    [req.params.teamId],
  );
  const { rows: msgRows } = await pool.query(
    "SELECT * FROM messages WHERE teamId = $1",
    [req.params.teamId],
  );
  const messages = msgRows.map(rowToMessage);
  res.json({
    team: teamRows[0],
    members,
    tasks,
    activities,
    notes,
    messages,
    exportedAt: new Date().toISOString(),
  });
});
