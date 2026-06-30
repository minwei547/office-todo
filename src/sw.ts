/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */
/**
 * 自定义 Service Worker
 * - 预缓存应用壳（vite-plugin-pwa injectManifest 模式）
 * - SPA 导航回退
 * - Web Push 事件处理（息屏通知）
 * - 通知点击跳转
 */
import { precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope;

// 预缓存清单由 vite-plugin-pwa 在构建时注入
precacheAndRoute(self.__WB_MANIFEST || []);

// SPA 导航回退：所有导航请求交给 index.html
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method === "GET" && req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/index.html") as Promise<Response>),
    );
  }
});

// ── 安装/激活 ─────────────────────────────
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Web Push：息屏通知 ─────────────────────
self.addEventListener("push", (event) => {
  let payload: {
    title: string;
    body: string;
    tag?: string;
    icon?: string;
    badge?: string;
    data?: { url?: string; type?: string };
  } = { title: "待办清单", body: "你有新消息" };

  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch {
    // 非 JSON，尝试纯文本
    if (event.data) {
      payload.body = event.data.text();
    }
  }

  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon ?? "/pwa-192.png",
    badge: payload.badge ?? "/pwa-192.png",
    tag: payload.tag ?? "office-todo",
    data: payload.data ?? { url: "/" },
    requireInteraction: false,
    silent: false,
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

// ── 通知点击：聚焦/打开窗口 ────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // 找到已打开的窗口并聚焦
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          // 通知主窗口打开对应抽屉
          client.postMessage({ type: "notification-click", url: targetUrl });
          return;
        }
      }
      // 没有已打开的窗口，打开新窗口
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});

// ── 消息通信：接收主线程的 push 订阅请求 ────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
