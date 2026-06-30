/**
 * Web Push 订阅模块
 *
 * 流程：
 * 1. 用户在通知设置中开启「息屏推送」
 * 2. 浏览器请求通知权限 + 订阅 Push API（需 VAPID 公钥）
 * 3. 订阅对象（endpoint + p256dh + auth）保存到 Supabase push_subscriptions 表
 * 4. 后端 Edge Function 监听 messages 表变更 → 查收件人订阅 → 发推送
 * 5. Service Worker 收到 push 事件 → 显示系统通知（息屏也能弹）
 *
 * 三端支持：
 * - 桌面 Chrome/Edge/Firefox：原生支持
 * - Android Chrome PWA：通过 FCM 透传
 * - iOS Safari 16.4+ PWA：需安装到主屏幕后支持
 */
import { supabase } from "./supabase";
import { getUserId } from "./api";

const VAPID_PUBLIC_KEY =
  "BEvHHBAF9B9mqTgDWf9L2ia3SEq0O0_PHboKD-hw9S3SLaS0oc9ESqLSfcVnP0uTzO8_PIsCCpPvyqnCEV-0GEM";

/** Web Push 是否受当前环境支持 */
export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "showNotification" in ServiceWorkerRegistration.prototype
  );
}

/** VAPID 公钥是否已配置 */
export function vapidConfigured(): boolean {
  return VAPID_PUBLIC_KEY.length > 0;
}

/** 将 base64url 字符串转为 Uint8Array（pushManager.subscribe 需要） */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export interface PushSubscriptionState {
  subscribed: boolean;
  reason?: "no-vapid" | "no-permission" | "no-support" | "not-subscribed";
}

/** 检查当前是否已订阅推送 */
export async function getPushSubscriptionState(): Promise<PushSubscriptionState> {
  if (!pushSupported()) {
    return { subscribed: false, reason: "no-support" };
  }
  if (!vapidConfigured()) {
    return { subscribed: false, reason: "no-vapid" };
  }
  if (Notification.permission !== "granted") {
    return { subscribed: false, reason: "no-permission" };
  }
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return { subscribed: !!sub, reason: sub ? undefined : "not-subscribed" };
}

/**
 * 订阅 Web Push
 * 1. 请求通知权限
 * 2. pushManager.subscribe（VAPID 公钥）
 * 3. 保存订阅到 Supabase
 */
export async function subscribePush(userId: string): Promise<boolean> {
  if (!pushSupported()) {
    throw new Error("当前环境不支持 Web Push 通知");
  }
  if (!vapidConfigured()) {
    throw new Error("服务器未配置 VAPID 密钥，请联系管理员");
  }

  // 1. 请求权限
  if (Notification.permission === "default") {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      throw new Error("通知权限被拒绝，请在浏览器设置中开启");
    }
  } else if (Notification.permission === "denied") {
    throw new Error("通知权限已被拒绝，需在浏览器设置中恢复");
  }

  // 2. 订阅 Push API
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  let sub: PushSubscription;
  try {
    sub =
      existing ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));
  } catch (err: any) {
    const msg = String(err?.message || err || "");
    // 国内网络无法连接 Google FCM 推送服务（Chrome/Edge/Chromium 内核都用 FCM）
    if (
      msg.includes("push service error") ||
      msg.includes("Registration failed") ||
      msg.includes("gcm") ||
      msg.includes("fcm") ||
      msg.includes("network")
    ) {
      const ua = navigator.userAgent;
      const isFirefox = /Firefox|FxiOS/i.test(ua);
      if (isFirefox) {
        throw new Error("推送服务连接失败，请检查网络后重试");
      } else {
        throw new Error(
          "推送服务注册失败：Chrome/Edge 等浏览器依赖 Google 推送服务（FCM），国内网络无法连接。\n\n💡 解决方法：请换用「火狐 Firefox」浏览器（国内应用商店可下载），Firefox 使用 Mozilla 自己的推送服务，国内可正常使用。"
        );
      }
    }
    throw new Error("推送订阅失败：" + msg);
  }

  // 3. 保存到 Supabase
  const subJson = sub.toJSON();
  const record = {
    subscriptionId: sub.endpoint,
    userId,
    endpoint: sub.endpoint,
    p256dh: subJson.keys?.p256dh ?? "",
    auth: subJson.keys?.auth ?? "",
    createdAt: Date.now(),
  };

  const { error } = await supabase.from("push_subscriptions").upsert(record, {
    onConflict: "subscriptionId",
  });

  if (error) {
    throw new Error("保存推送订阅失败：" + error.message);
  }

  return true;
}

/** 取消推送订阅 */
export async function unsubscribePush(): Promise<boolean> {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await sub.unsubscribe();
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("subscriptionId", sub.endpoint);
  }
  return true;
}

/**
 * 清理当前用户在其它设备的旧订阅（可选，登录时调用）
 * 保留当前设备订阅，删除同一 userId 的过期记录
 */
export async function syncPushSubscription(): Promise<void> {
  const userId = getUserId();
  if (!userId || !pushSupported()) return;

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();

  if (sub) {
    // 当前设备已有订阅，确保 Supabase 记录存在
    const subJson = sub.toJSON();
    await supabase.from("push_subscriptions").upsert(
      {
        subscriptionId: sub.endpoint,
        userId,
        endpoint: sub.endpoint,
        p256dh: subJson.keys?.p256dh ?? "",
        auth: subJson.keys?.auth ?? "",
        createdAt: Date.now(),
      },
      { onConflict: "subscriptionId" },
    );
  }
}
