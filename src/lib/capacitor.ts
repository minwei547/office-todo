/**
 * Capacitor 运行时初始化
 * - 检测是否运行在原生壳内
 * - 配置状态栏、启动屏、键盘行为
 * - 在原生壳里桥接通知 API（若已安装 @capacitor/local-notifications）
 *
 * Web 端调用此模块是安全的：所有原生 API 都通过 Capacitor.isNativePlatform()
 * 守卫，Web 端运行时不会触发原生调用。
 */
import { Capacitor } from '@capacitor/core';

let initialized = false;

export async function initCapacitor(): Promise<void> {
  if (initialized) return;
  initialized = true;

  // Web 端不需要初始化原生插件
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // 动态导入，避免 Web 端打包原生插件代码
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#fcfcfe' });
  } catch {
    /* status-bar 不可用，忽略 */
  }

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {
    /* splash-screen 不可用，忽略 */
  }

  try {
    const { Keyboard } = await import('@capacitor/keyboard');
    await Keyboard.setAccessoryBarVisible({ isVisible: false });
  } catch {
    /* keyboard 不可用，忽略 */
  }
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * 在原生壳里请求通知权限并创建本地通知通道。
 * Web 端走 Notification API（见 notify.ts）。
 */
export async function requestNativeNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const perm = await LocalNotifications.requestPermissions();
    return perm.display === 'granted';
  } catch {
    return false;
  }
}

/**
 * 在原生 App 中弹出本地通知（不需要推送服务，App 在后台也能弹）。
 * @param title 通知标题
 * @param body 通知内容
 * @param notificationId 通知唯一ID（防止重复）
 */
export async function scheduleNativeNotification(
  title: string,
  body: string,
  notificationId?: number,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return;
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: notificationId ?? Math.floor(Math.random() * 100000),
          schedule: { at: new Date(Date.now() + 100) },
          sound: 'default',
          smallIcon: 'ic_stat_icon',
        },
      ],
    });
  } catch {
    /* ignore */
  }
}
