/**
 * PWA 安装引导 Hook
 *
 * - Android Chrome / 桌面 Chrome/Edge：监听 beforeinstallprompt 事件
 *   用户点按钮 → 调用 prompt() → 弹出系统安装对话框
 * - iOS Safari：不支持 beforeinstallprompt，需手动"添加到主屏幕"
 *   自动检测 iOS 平台，返回分步引导文案
 * - 已安装（standalone 模式）：返回 installed=true，UI 不再显示安装按钮
 */
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface PwaInstallState {
  /** 是否已安装为 PWA（standalone 模式） */
  installed: boolean;
  /** 是否可触发自动安装弹窗（Android Chrome / 桌面 Chrome/Edge） */
  canPrompt: boolean;
  /** 是否是 iOS Safari（需手动引导） */
  isIOS: boolean;
  /** 是否在 Safari 浏览器中（iOS 上只有 Safari 支持 PWA） */
  isSafari: boolean;
  /** 安装中 */
  installing: boolean;
  /** 是否是 Android 平台 */
  isAndroid: boolean;
  /** 是否是微信内置浏览器（不支持 Service Worker） */
  isWeChat: boolean;
  /** 是否是 QQ 内置浏览器 */
  isQQ: boolean;
  /** 是否是桌面端 */
  isDesktop: boolean;
}

/** 浏览器对 Web Push 的支持状态 */
export type BrowserSupport =
  | "supported"        // 完全支持
  | "wechat"           // 微信内置，不支持
  | "qq"               // QQ 内置，不支持
  | "ios-non-safari"   // iOS 但非 Safari，不支持
  | "old-ios"          // iOS 版本低于 16.4
  | "unknown";         // 其他未知

export function usePwaInstall() {
  const [state, setState] = useState<PwaInstallState>({
    installed: false,
    canPrompt: false,
    isIOS: false,
    isSafari: false,
    installing: false,
    isAndroid: false,
    isWeChat: false,
    isQQ: false,
    isDesktop: false,
  });
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // 检测是否已安装（standalone 模式）
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari standalone
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    // 检测 iOS + Safari
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) ||
      // iPadOS 13+ 伪装成 macOS
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
    const isAndroid = /Android/.test(ua);
    const isWeChat = /MicroMessenger/i.test(ua);
    const isQQ = /QQBrowser|QQ\//i.test(ua) && !isWeChat;
    const isDesktop = !isIOS && !isAndroid;

    setState((s) => ({
      ...s,
      installed: isStandalone,
      isIOS,
      isSafari,
      isAndroid,
      isWeChat,
      isQQ,
      isDesktop,
    }));

    // 监听 beforeinstallprompt（仅 Android Chrome / 桌面 Chromium 浏览器）
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setState((s) => ({ ...s, canPrompt: true }));
    };

    // 监听已安装
    const onInstalled = () => {
      setDeferredPrompt(null);
      setState((s) => ({
        ...s,
        installed: true,
        canPrompt: false,
        installing: false,
      }));
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  /** 触发安装弹窗（Android Chrome / 桌面 Chromium 浏览器） */
  async function promptInstall() {
    if (!deferredPrompt) return false;
    setState((s) => ({ ...s, installing: true }));
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      const accepted = choice.outcome === "accepted";
      setDeferredPrompt(null);
      setState((s) => ({
        ...s,
        canPrompt: false,
        installing: false,
        installed: accepted,
      }));
      return accepted;
    } catch {
      setState((s) => ({ ...s, installing: false }));
      return false;
    }
  }

  /** 检测当前浏览器对 Web Push 的支持情况 */
  function checkBrowserSupport(): BrowserSupport {
    const ua = navigator.userAgent;
    // 微信内置浏览器
    if (/MicroMessenger/i.test(ua)) return "wechat";
    // iOS 平台
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isIOSDevice) {
      const isSafariBrowser =
        /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
      if (!isSafariBrowser) return "ios-non-safari";
      // 检查 iOS 版本（需 16.4+）
      const match = ua.match(/OS (\d+)[_\d]+ like Mac OS X/i);
      const major = match ? parseInt(match[1], 10) : 0;
      // 简单判断：版本号 16 以上认为支持（16.4 无法从 UA 精确判断，这里宽松处理）
      if (major < 16) return "old-ios";
    }
    return "supported";
  }

  return { ...state, promptInstall, checkBrowserSupport };
}
