/**
 * 通知模块
 * - 请求系统通知权限
 * - 在前台/后台时弹系统通知（PWA 安装后、息屏仍可弹）
 * - 通知点击聚焦窗口并跳转
 * - 偏好持久化在 localStorage
 *
 * 设计：本应用是前端直连 Supabase + 5s 轮询同步的架构，
 * 没有独立后端推送服务。因此采用「应用运行时检测到事件就弹通知」的方案：
 * · App 在前台：通过 socket 轮询检测到新事件立即弹通知
 * · App 在后台/息屏：Service Worker 常驻，监听 visibilitychange 与
 *   定时唤起，仍然能在已安装的 PWA 中弹通知（受系统后台策略影响）
 * · 三端通用：Web / iOS PWA(16.4+) / Android PWA / Capacitor 原生壳
 */

const PREF_KEY = "office-todo-notify-pref";

export type NotificationPref = {
  /** 总开关 */
  enabled: boolean;
  /** 新私信到达 */
  dm: boolean;
  /** 任务被指派给我 */
  assigned: boolean;
  /** 我负责的任务状态变更 */
  taskUpdated: boolean;
  /** 振动（移动端） */
  vibrate: boolean;
};

export const DEFAULT_PREF: NotificationPref = {
  enabled: true,
  dm: true,
  assigned: true,
  taskUpdated: false, // 默认关，避免太吵
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

/** 浏览器/PWA 是否支持通知 API */
export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** 当前权限状态 */
export function notificationPermission(): NotificationPermission {
  if (!notificationsSupported()) return "denied";
  return Notification.permission;
}

/**
 * 请求通知权限。返回是否获得授权。
 * 注意：iOS Safari 必须在用户手势中调用。
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
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

/**
 * 弹出系统通知。若 App 在前台且 document 可见，仍弹（用户能看到）。
 * 在 PWA 安装后，息屏也能弹。
 */
export function showNotification(opts: ShowOptions): void {
  if (!notificationsSupported()) return;
  if (Notification.permission !== "granted") return;
  const pref = loadPref();
  if (!pref.enabled) return;
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
      try {
        navigator.vibrate([60, 30, 60]);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* Notification 构造可能失败（iOS PWA 限制），忽略 */
  }
}

/** 私信通知：收到他人发来的消息时调用 */
export function notifyDM(senderName: string, preview: string): void {
  const pref = loadPref();
  if (!pref.dm) return;
  showNotification({
    title: `💬 ${senderName}`,
    body: preview.length > 60 ? preview.slice(0, 60) + "…" : preview,
    tag: "dm",
    data: { url: "/?dm=1" },
    onClick: () => {
      // 触发打开私信抽屉（通过 URL 参数由 App 处理）
      window.dispatchEvent(new CustomEvent("app:open-dm"));
    },
  });
}

/** 任务指派通知 */
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

/** 任务状态/进度变更通知 */
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
