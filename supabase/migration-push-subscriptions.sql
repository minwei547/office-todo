-- ============================================
-- 增量迁移：添加 push_subscriptions 表（息屏推送）
-- 安全执行：不会删除已有数据，仅新增表 + 索引 + RLS
-- 在 Supabase SQL Editor 中执行此脚本即可
-- ============================================

-- 7. 推送订阅表（Web Push，用于息屏通知）
CREATE TABLE IF NOT EXISTS push_subscriptions (
  "subscriptionId" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "createdAt" BIGINT NOT NULL
);

-- 索引：按 userId 查询用户的所有设备订阅
CREATE INDEX IF NOT EXISTS idx_push_subs_userId ON push_subscriptions("userId");

-- RLS：启用 + 允许 anon 读写（前端直连）
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_push_subs" ON push_subscriptions;
CREATE POLICY "anon_all_push_subs" ON push_subscriptions
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- 刷新 PostgREST schema cache，让新表立即生效
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '✅ push_subscriptions 表已创建（表 + 索引 + RLS 策略）';
END $$;
