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
}

export function usePwaInstall() {
  const [state, setState] = useState<PwaInstallState>({
    installed: false,
    canPrompt: false,
    isIOS: false,
    isSafari: false,
    installing: false,
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

    setState((s) => ({
      ...s,
      installed: isStandalone,
      isIOS,
      isSafari,
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

  return { ...state, promptInstall };
}
