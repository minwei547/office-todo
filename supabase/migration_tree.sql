-- 迁移脚本：为 tasks 表添加树形层级字段
-- 请在 Supabase SQL Editor 中执行

-- 添加 parentId 字段（父任务 ID，null 为顶级任务）
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "parentId" TEXT;

-- 添加 sortOrder 字段（同级排序，默认 0）
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_tasks_parentId ON tasks("parentId");
CREATE INDEX IF NOT EXISTS idx_tasks_teamId_sortOrder ON tasks("teamId", "sortOrder");
