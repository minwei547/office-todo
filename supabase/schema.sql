-- 办公室共享待办清单 - Supabase 建表脚本
-- 在 Supabase SQL Editor 中执行

-- 先删除旧表（幂等操作，第一次执行不会报错）
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS teams;

CREATE TABLE teams (
  teamId TEXT PRIMARY KEY,
  teamName TEXT NOT NULL,
  inviteCode TEXT NOT NULL UNIQUE,
  ownerId TEXT NOT NULL,
  createdAt BIGINT NOT NULL
);

CREATE TABLE members (
  memberId TEXT PRIMARY KEY,
  teamId TEXT NOT NULL REFERENCES teams(teamId) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  avatarChar TEXT NOT NULL,
  joinedAt BIGINT NOT NULL
);
CREATE INDEX idx_members_team ON members(teamId);

CREATE TABLE tasks (
  taskId TEXT PRIMARY KEY,
  teamId TEXT NOT NULL REFERENCES teams(teamId) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  assigneeId TEXT REFERENCES members(memberId) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  dueDate TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  progress INT NOT NULL DEFAULT 0,
  createdAt BIGINT NOT NULL,
  updatedAt BIGINT NOT NULL,
  archived BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX idx_tasks_team ON tasks(teamId);
CREATE INDEX idx_tasks_assignee ON tasks(assigneeId);

CREATE TABLE activities (
  activityId TEXT PRIMARY KEY,
  taskId TEXT NOT NULL REFERENCES tasks(taskId) ON DELETE CASCADE,
  actorId TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  timestamp BIGINT NOT NULL
);
CREATE INDEX idx_activities_task ON activities(taskId);

CREATE TABLE notes (
  noteId TEXT PRIMARY KEY,
  taskId TEXT NOT NULL REFERENCES tasks(taskId) ON DELETE CASCADE,
  authorId TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp BIGINT NOT NULL
);
CREATE INDEX idx_notes_task ON notes(taskId);

CREATE TABLE messages (
  messageId TEXT PRIMARY KEY,
  teamId TEXT NOT NULL REFERENCES teams(teamId) ON DELETE CASCADE,
  conversationId TEXT NOT NULL,
  senderId TEXT NOT NULL,
  receiverId TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX idx_messages_conv ON messages(conversationId);
CREATE INDEX idx_messages_receiver ON messages(receiverId);
CREATE INDEX idx_messages_team ON messages(teamId);

-- 启用实时同步（需开启 Supabase Realtime）
ALTER TABLE teams REPLICA IDENTITY FULL;
ALTER TABLE members REPLICA IDENTITY FULL;
ALTER TABLE tasks REPLICA IDENTITY FULL;
ALTER TABLE activities REPLICA IDENTITY FULL;
ALTER TABLE notes REPLICA IDENTITY FULL;
ALTER TABLE messages REPLICA IDENTITY FULL;
