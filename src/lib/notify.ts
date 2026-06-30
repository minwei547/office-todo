/**
 * 通知模块
 * - 请求系统通知权限
 * - 在前台/后台时弹系统通知
 * - 通知点击聚焦窗口并跳转
 * - 偏好持久化在 localStorage
 *
 * 三端支持：
 * - Capacitor 原生 App（安卓/iOS）：使用 LocalNotifications 插件弹原生通知
 * - Web / PWA：使用浏览器 Notification API + Web Push 息屏推送
 */

const PREF_KEY = "office-todo-notify-pref";

export type NotificationPref = {
  enabled: boolean;
  dm: boolean;
  assigned: boolean;
  taskUpdated: boolean;
  vibrate: boolean;
};

export const DEFAULT_PREF: NotificationPref = {
  enabled: true,
  dm: true,
  assigned: true,
  taskUpdated: false,
  vibrate: true,
};

export function loadPref(): NotificationPref {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return { ...DEFAULT_PREF };
    return { ...DEFAULT_PREF, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREF };
  }
}

export function savePref(pref: NotificationPref) {
  localStorage.setItem(PREF_KEY, JSON.stringify(pref));
}

let _isNativeCache: boolean | null = null;
async function isNative(): Promise<boolean> {
  if (_isNativeCache !== null) return _isNativeCache;
  try {
    const { isNativeApp } = await import("./capacitor");
    _isNativeCache = isNativeApp();
  } catch {
    _isNativeCache = false;
  }
  return _isNativeCache;
}

export function notificationsSupported(): boolean {
  return true;
}

let _nativePermCache: NotificationPermission = "default";
export async function checkNotificationPermission(): Promise<NotificationPermission> {
  if (await isNative()) {
    const { getNativeNotificationPermission } = await import("./capacitor");
    _nativePermCache = await getNativeNotificationPermission();
    return _nativePermCache;
  }
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  return Notification.permission;
}

export function notificationPermission(): NotificationPermission {
  if (_isNativeCache) return _nativePermCache;
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (await isNative()) {
    const { requestNativeNotificationPermission } = await import("./capacitor");
    const ok = await requestNativeNotificationPermission();
    _nativePermCache = ok ? "granted" : "denied";
    return ok;
  }
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

interface ShowOptions {
  title: string;
  body: string;
  tag?: string;
  data?: { url?: string };
  icon?: string;
  onClick?: () => void;
}

export function showNotification(opts: ShowOptions): void {
  const pref = loadPref();
  if (!pref.enabled) return;

  import("./capacitor").then(async ({ isNativeApp, scheduleNativeNotification }) => {
    if (isNativeApp()) {
      await scheduleNativeNotification(opts.title, opts.body);
      if (pref.vibrate && "vibrate" in navigator) {
        try { navigator.vibrate([60, 30, 60]); } catch { /* ignore */ }
      }
      return;
    }

    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    try {
      const n = new Notification(opts.title, {
        body: opts.body,
        tag: opts.tag,
        icon: opts.icon ?? "/pwa-192.png",
        badge: "/pwa-192.png",
        data: opts.data,
        silent: false,
      });
      n.onclick = () => {
        window.focus();
        opts.onClick?.();
        n.close();
      };
      if (pref.vibrate && "vibrate" in navigator) {
        try { navigator.vibrate([60, 30, 60]); } catch { /* ignore */ }
      }
    } catch {
      /* ignore */
    }
  });
}

export function notifyDM(senderName: string, preview: string): void {
  const pref = loadPref();
  if (!pref.dm) return;
  showNotification({
    title: `💬 ${senderName}`,
    body: preview.length > 60 ? preview.slice(0, 60) + "…" : preview,
    tag: "dm",
    data: { url: "/?dm=1" },
    onClick: () => {
      window.dispatchEvent(new CustomEvent("app:open-dm"));
    },
  });
}

export function notifyAssigned(taskTitle: string, byName?: string): void {
  const pref = loadPref();
  if (!pref.assigned) return;
  showNotification({
    title: "📌 任务指派给你",
    body: `${taskTitle}${byName ? ` · 由 ${byName} 指派` : ""}`,
    tag: "assigned",
    onClick: () => {
      window.dispatchEvent(new CustomEvent("app:open-tasks"));
    },
  });
}

export function notifyTaskUpdated(taskTitle: string, change: string): void {
  const pref = loadPref();
  if (!pref.taskUpdated) return;
  showNotification({
    title: "✏️ 任务有更新",
    body: `${taskTitle} · ${change}`,
    tag: "task-updated",
    onClick: () => {
      window.dispatchEvent(new CustomEvent("app:open-tasks"));
    },
  });
}
