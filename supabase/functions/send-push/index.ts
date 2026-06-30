/**
 * Supabase Edge Function: send-push
 *
 * 触发方式：Database Webhook → 当 messages 表 INSERT 时调用
 *   Supabase Dashboard → Database → Webhooks → 新建
 *   表：messages，事件：INSERT，URL：https://<project>.functions.supabase.co/send-push
 *
 * 功能：
 *   1. 从 webhook payload 读取新消息（senderId, receiverId, content, kind）
 *   2. 通过 members 表将 receiverId 映射到 userId
 *   3. 查询该 userId 的所有 push_subscriptions（多设备）
 *   4. 用 VAPID 密钥 + web-push 协议向每个订阅发送推送
 *   5. 清理失效的订阅（410 Gone / 404）
 *
 * 环境变量（通过 supabase secrets set 配置）：
 *   VAPID_PUBLIC_KEY   — VAPID 公钥（node scripts/gen-vapid.mjs 生成）
 *   VAPID_PRIVATE_KEY  — VAPID 私钥
 *   VAPID_SUBJECT      — mailto: 或 https: 联系方式
 *   SUPABASE_URL       — Supabase 项目 URL
 *   SUPABASE_SERVICE_ROLE_KEY — service role key（绕过 RLS）
 *
 * 部署：
 *   supabase functions deploy send-push --no-verify-jwt
 */

// @ts-nocheck — Deno 环境，跳过 Node 类型检查
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webPush from "https://esm.sh/web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

interface PushSubscriptionRow {
  subscriptionId: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface MessagePayload {
  type: "INSERT";
  table: string;
  record: {
    messageId: string;
    teamId: string;
    senderId: string;
    receiverId: string;
    content: string;
    kind: string;
    timestamp: number;
  };
}

Deno.serve(async (req: Request) => {
  // CORS + 健康检查
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ ok: true, name: "send-push", vapid: !!VAPID_PUBLIC_KEY }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  // 校验环境变量
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error("缺少 VAPID 密钥，请运行: supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...");
    return new Response("VAPID keys not configured", { status: 500 });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
    return new Response("Supabase config missing", { status: 500 });
  }

  // 解析 webhook payload
  let payload: MessagePayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const msg = payload.record;
  if (!msg || !msg.receiverId) {
    return new Response("No message record", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // 1. 通过 receiverId（memberId）查找对应的 userId
  const { data: memberRow, error: memberErr } = await supabase
    .from("members")
    .select('"memberId", "userId", "nickname"')
    .eq('"memberId"', msg.receiverId)
    .single();

  if (memberErr || !memberRow) {
    console.log("收件人 member 不存在:", msg.receiverId);
    return new Response("ok", { status: 200 });
  }

  const member = memberRow as { memberId: string; userId: string | null; nickname: string };
  if (!member.userId) {
    console.log("收件人无 userId（匿名成员），跳过推送");
    return new Response("ok", { status: 200 });
  }

  // 2. 查找该用户的所有推送订阅（多设备）
  const { data: subs, error: subsErr } = await supabase
    .from("push_subscriptions")
    .select('"subscriptionId", "userId", "endpoint", "p256dh", "auth"')
    .eq('"userId"', member.userId);

  if (subsErr || !subs || subs.length === 0) {
    console.log("用户无推送订阅:", member.userId);
    return new Response("ok", { status: 200 });
  }

  // 3. 查找发送者昵称
  let senderName = "队友";
  if (msg.senderId) {
    const { data: senderRow } = await supabase
      .from("members")
      .select('"nickname"')
      .eq('"memberId"', msg.senderId)
      .single();
    if (senderRow) senderName = (senderRow as { nickname: string }).nickname;
  }

  // 4. 构建通知内容
  const isImage = msg.kind === "image";
  const preview = isImage ? "[图片]" : msg.content;
  const notificationPayload = JSON.stringify({
    title: `💬 ${senderName}`,
    body: preview.length > 60 ? preview.slice(0, 60) + "…" : preview,
    tag: "dm",
    icon: "/pwa-192.png",
    badge: "/pwa-192.png",
    data: { url: "/?dm=1", type: "dm" },
  });

  // 5. 配置 VAPID 并发送 Web Push
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const failedSubs: string[] = [];
  let sentCount = 0;

  for (const sub of subs as PushSubscriptionRow[]) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };
    try {
      await webPush.sendNotification(pushSubscription, notificationPayload);
      sentCount++;
      console.log("推送成功:", sub.subscriptionId);
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      console.error("推送失败:", sub.subscriptionId, statusCode);
      // 410 Gone / 404 → 订阅已失效，需清理
      if (statusCode === 410 || statusCode === 404) {
        failedSubs.push(sub.subscriptionId);
      }
    }
  }

  // 6. 清理失效订阅
  if (failedSubs.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in('"subscriptionId"', failedSubs);
    console.log("已清理失效订阅:", failedSubs.length, "条");
  }

  return new Response(
    JSON.stringify({ ok: true, sent: sentCount, cleaned: failedSubs.length }),
    { headers: { "Content-Type": "application/json" } },
  );
});
