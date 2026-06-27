// 数据库初始化 + schema
// 所有表用 PostgreSQL 存储，连接池通过 DATABASE_URL 注入
import { Pool } from "pg";

// Render Postgres 通过 process.env.DATABASE_URL 提供
// DATABASE_SSL=true 时开启 SSL（Render 免费层需要）
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: false }
      : undefined,
});

// 创建所有表（启动时调用一次）
// - Postgres 用 BOOLEAN 真布尔（archived / read），不需要 0/1
// - 主键用 TEXT（沿用既有 ID 生成策略：t_/m_/k_/a_/n_/d_ 前缀 + nanoid）
// - tags 用 TEXT 存 JSON 字符串，保持与原实现一致
export async function initSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS teams (
      teamId      TEXT PRIMARY KEY,
      teamName    TEXT NOT NULL,
      inviteCode  TEXT NOT NULL UNIQUE,
      ownerId     TEXT NOT NULL,
      createdAt   INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS members (
      memberId    TEXT PRIMARY KEY,
      teamId      TEXT NOT NULL REFERENCES teams(teamId) ON DELETE CASCADE,
      nickname    TEXT NOT NULL,
      avatarChar  TEXT NOT NULL,
      joinedAt    INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_members_team ON members(teamId);

    CREATE TABLE IF NOT EXISTS tasks (
      taskId       TEXT PRIMARY KEY,
      teamId       TEXT NOT NULL REFERENCES teams(teamId) ON DELETE CASCADE,
      title        TEXT NOT NULL,
      description  TEXT NOT NULL DEFAULT '',
      assigneeId   TEXT REFERENCES members(memberId) ON DELETE SET NULL,
      status       TEXT NOT NULL DEFAULT 'todo',
      priority     TEXT NOT NULL DEFAULT 'medium',
      dueDate      TEXT,
      tags         TEXT NOT NULL DEFAULT '[]',
      progress     INTEGER NOT NULL DEFAULT 0,
      createdAt    INTEGER NOT NULL,
      updatedAt    INTEGER NOT NULL,
      archived     BOOLEAN NOT NULL DEFAULT false
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_team ON tasks(teamId);
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assigneeId);

    CREATE TABLE IF NOT EXISTS activities (
      activityId  TEXT PRIMARY KEY,
      taskId      TEXT NOT NULL REFERENCES tasks(taskId) ON DELETE CASCADE,
      actorId     TEXT NOT NULL,
      type        TEXT NOT NULL,
      payload     TEXT NOT NULL DEFAULT '{}',
      timestamp   INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_activities_task ON activities(taskId);

    CREATE TABLE IF NOT EXISTS notes (
      noteId     TEXT PRIMARY KEY,
      taskId     TEXT NOT NULL REFERENCES tasks(taskId) ON DELETE CASCADE,
      authorId   TEXT NOT NULL,
      content    TEXT NOT NULL,
      timestamp  INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notes_task ON notes(taskId);

    CREATE TABLE IF NOT EXISTS messages (
      messageId       TEXT PRIMARY KEY,
      teamId          TEXT NOT NULL REFERENCES teams(teamId) ON DELETE CASCADE,
      conversationId  TEXT NOT NULL,
      senderId        TEXT NOT NULL,
      receiverId      TEXT NOT NULL,
      content         TEXT NOT NULL,
      timestamp       INTEGER NOT NULL,
      read            BOOLEAN NOT NULL DEFAULT false
    );
    CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversationId);
    CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiverId);
    CREATE INDEX IF NOT EXISTS idx_messages_team ON messages(teamId);
  `);
}

// 工具：把行里的 archived 从 BOOLEAN 转成 JS boolean，tags 从 JSON 字符串 parse 成数组
// Postgres 已经是真布尔，!!row.archived 无副作用；tags 用 TEXT 存 JSON，需要 parse
export function rowToTask(row: any) {
  return {
    ...row,
    tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags ?? "[]"),
    archived: !!row.archived,
  };
}

// 工具：把行里的 read 从 BOOLEAN 转成 JS boolean
export function rowToMessage(row: any) {
  return { ...row, read: !!row.read };
}
