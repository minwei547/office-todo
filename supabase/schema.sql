-- ============================================
-- 办公室共享待办清单 - 数据库建表脚本
-- 在 Supabase SQL Editor 中执行此脚本
-- 注意：所有驼峰命名标识符必须用双引号包裹，
-- 否则 PostgreSQL 会自动转成小写存储，
-- 导致 PostgREST 暴露的列名与前端代码不一致
-- ============================================

-- 清理旧表（如果存在）
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 0. 用户账号表（跨设备身份）
CREATE TABLE users (
  "userId" TEXT PRIMARY KEY,
  "username" TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "nickname" TEXT NOT NULL,
  "createdAt" BIGINT NOT NULL
);

-- 1. 团队表
CREATE TABLE teams (
  "teamId" TEXT PRIMARY KEY,
  "teamName" TEXT NOT NULL,
  "inviteCode" TEXT UNIQUE NOT NULL,
  "ownerId" TEXT NOT NULL,
  "createdAt" BIGINT NOT NULL
);

-- 2. 成员表
CREATE TABLE members (
  "memberId" TEXT PRIMARY KEY,
  "teamId" TEXT NOT NULL,
  "userId" TEXT,
  "nickname" TEXT NOT NULL,
  "avatarChar" TEXT NOT NULL DEFAULT '?',
  "joinedAt" BIGINT NOT NULL
);

-- 3. 任务表
CREATE TABLE tasks (
  "taskId" TEXT PRIMARY KEY,
  "teamId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT DEFAULT '',
  "assigneeId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'todo',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "dueDate" TEXT,
  "tags" TEXT NOT NULL DEFAULT '[]',
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  "archived" BOOLEAN NOT NULL DEFAULT FALSE
);

-- 4. 活动记录表
CREATE TABLE activities (
  "activityId" TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payload" TEXT DEFAULT '{}',
  "timestamp" BIGINT NOT NULL
);

-- 5. 任务备注表
CREATE TABLE notes (
  "noteId" TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "timestamp" BIGINT NOT NULL
);

-- 6. 私信表
CREATE TABLE messages (
  "messageId" TEXT PRIMARY KEY,
  "teamId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "receiverId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'text',
  "timestamp" BIGINT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================
-- 索引（列名也要加双引号）
-- 针对数据量增长的查询路径优化：
-- · 任务按团队 + 归档过滤 + 排序
-- · 任务按负责人筛选
-- · 私信按会话 + 时间倒序分页
-- · 活动按任务 + 时间排序
-- ============================================
CREATE INDEX idx_members_teamId ON members("teamId");
CREATE INDEX idx_members_userId ON members("userId");
CREATE INDEX idx_users_username ON users("username");
CREATE INDEX idx_teams_inviteCode ON teams("inviteCode");

-- 任务：常用筛选/排序路径
CREATE INDEX idx_tasks_teamId ON tasks("teamId");
CREATE INDEX idx_tasks_status ON tasks("status");
CREATE INDEX idx_tasks_teamId_archived ON tasks("teamId", "archived");
CREATE INDEX idx_tasks_assigneeId ON tasks("assigneeId");
CREATE INDEX idx_tasks_teamId_createdAt ON tasks("teamId", "createdAt" DESC);
CREATE INDEX idx_tasks_dueDate ON tasks("dueDate");

-- 活动：按任务 + 时间排序
CREATE INDEX idx_activities_taskId ON activities("taskId");
CREATE INDEX idx_activities_taskId_timestamp ON activities("taskId", "timestamp" DESC);

-- 备注：按任务 + 时间排序
CREATE INDEX idx_notes_taskId ON notes("taskId");
CREATE INDEX idx_notes_taskId_timestamp ON notes("taskId", "timestamp" DESC);

-- 私信：会话分页加载核心索引
-- getConversation 用 conversationId + timestamp DESC + LIMIT
CREATE INDEX idx_messages_conversationId ON messages("conversationId");
CREATE INDEX idx_messages_conv_timestamp ON messages("conversationId", "timestamp" DESC);
CREATE INDEX idx_messages_receiver_read ON messages("receiverId", "read");
CREATE INDEX idx_messages_teamId ON messages("teamId");

-- ============================================
-- RLS 策略（允许 anon 角色完全访问所有表）
-- 注意：这是内部团队工具，不做细粒度权限控制
-- 安全性由应用层（x-member-id + 业务逻辑校验）保证
-- ============================================

-- 先启用 RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- users 表：允许 anon 全部操作（前端直连，安全性由应用层校验）
CREATE POLICY "anon_all_users" ON users
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- teams 表：允许 anon 全部操作
CREATE POLICY "anon_all_teams" ON teams
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- members 表：允许 anon 全部操作
CREATE POLICY "anon_all_members" ON members
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- tasks 表：允许 anon 全部操作
CREATE POLICY "anon_all_tasks" ON tasks
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- activities 表：允许 anon 全部操作
CREATE POLICY "anon_all_activities" ON activities
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- notes 表：允许 anon 全部操作
CREATE POLICY "anon_all_notes" ON notes
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- messages 表：允许 anon 全部操作
CREATE POLICY "anon_all_messages" ON messages
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Storage bucket：私信图片
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('dm-images', 'dm-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage 策略：允许 anon 读写
CREATE POLICY "anon_upload_dm_images" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'dm-images');

CREATE POLICY "anon_read_dm_images" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'dm-images');

-- 强制刷新 PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 完成提示
DO $$
BEGIN
  RAISE NOTICE '✅ 建表完成！共创建 7 张表 + 18 个索引 + 7 条 RLS 策略 + 1 个 Storage bucket（所有驼峰列名已加双引号）';
END $$;
