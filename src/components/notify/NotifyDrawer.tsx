import { useEffect, useState } from "react";
import {
  Bell,
  BellRing,
  Check,
  Download,
  Share,
  Smartphone,
  Vibrate,
} from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { useUIStore } from "@/store/uiStore";
import { useTodoStore } from "@/store/todoStore";
import {
  loadPref,
  savePref,
  requestNotificationPermission,
  notificationPermission,
  checkNotificationPermission,
  showNotification,
  type NotificationPref,
} from "@/lib/notify";
import {
  pushSupported,
  vapidConfigured,
  getPushSubscriptionState,
  subscribePush,
  unsubscribePush,
} from "@/lib/push";
import { usePwaInstall } from "@/lib/usePwaInstall";
import { isNativeApp } from "@/lib/capacitor";

type PushStatus =
  | "loading"
  | "subscribed"
  | "not-subscribed"
  | "no-vapid"
  | "no-permission"
  | "no-support"
  | "native-app";

export function NotifyDrawer() {
  const open = useUIStore((s) => s.notifyDrawerOpen);
  const setOpen = useUIStore((s) => s.setNotifyDrawer);
  const user = useTodoStore((s) => s.user);
  const [pref, setPref] = useState<NotificationPref>(loadPref());
  const [permission, setPermission] = useState<NotificationPermission>(
    notificationPermission(),
  );
  const [pushStatus, setPushStatus] = useState<PushStatus>("loading");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState("");
  const pwa = usePwaInstall();
  const [isNative, setIsNative] = useState(false);

  async function refreshPushStatus() {
    if (isNativeApp()) {
      setPushStatus("native-app");
      return;
    }
    if (!pushSupported()) {
      setPushStatus("no-support");
      return;
    }
    if (!vapidConfigured()) {
      setPushStatus("no-vapid");
      return;
    }
    const state = await getPushSubscriptionState();
    setPushStatus(state.subscribed ? "subscribed" : (state.reason as PushStatus) ?? "not-subscribed");
  }

  useEffect(() => {
    setIsNative(isNativeApp());
  }, []);

  useEffect(() => {
    if (open) {
      checkNotificationPermission().then(setPermission);
      setPushError("");
      refreshPushStatus();
    }
  }, [open]);

  function update(patch: Partial<NotificationPref>) {
    const next = { ...pref, ...patch };
    setPref(next);
    savePref(next);
  }

  async function handleEnable() {
    const ok = await requestNotificationPermission();
    const p = await checkNotificationPermission();
    setPermission(p);
    if (ok) {
      update({ enabled: true });
      showNotification({
        title: "✅ 通知已开启",
        body: "新私信和任务指派会在此弹出",
        tag: "test",
      });
    }
  }

  async function handleTogglePush() {
    setPushError("");
    if (!user) {
      setPushError("请先登录");
      return;
    }
    setPushBusy(true);
    try {
      if (pushStatus === "subscribed") {
        await unsubscribePush();
      } else {
        if (Notification.permission !== "granted") {
          const ok = await requestNotificationPermission();
          const p = await checkNotificationPermission();
          setPermission(p);
          if (!ok) {
            setPushError("通知权限被拒绝，请手动开启权限");
            return;
          }
        }
        await subscribePush(user.userId);
        update({ enabled: true });
      }
      await refreshPushStatus();
    } catch (e: any) {
      setPushError(e.message ?? "操作失败");
    } finally {
      setPushBusy(false);
    }
  }

  const pushReady = pushSupported() && vapidConfigured() && !isNative;

  return (
    <Drawer
      open={open}
      onClose={() => setOpen(false)}
      title={
        <div className="flex items-center gap-2">
          <BellRing size={14} className="text-[#4a7a68]" />
          通知设置
        </div>
      }
      subtitle="收到新消息时弹出系统通知"
      widthClass="w-[420px] max-w-[92vw]"
    >
      {/* 顶部引导卡片：安卓APK / iOS Safari / 桌面 */}
      <InstallGuide pwa={pwa} isNative={isNative} />

      {/* 权限状态 */}
      <section className="mb-5 biz-card rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="h-9 w-9 grid place-items-center rounded-full bg-mint-soft text-[#4a7a68]">
              <Bell size={16} />
            </span>
            <div>
              <div className="text-[13px] font-medium text-ink">通知权限</div>
              <div className="mono-meta">
                {permission === "granted"
                  ? "已授权"
                  : permission === "denied"
                    ? "已被拒绝，需手动开启"
                    : "未授权"}
              </div>
            </div>
          </div>
          {permission !== "granted" ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleEnable}
              disabled={permission === "denied"}
            >
              {permission === "denied" ? "已拒绝" : "开启"}
            </Button>
          ) : null}
        </div>
        {permission === "denied" ? (
          <PermissionDeniedHelp pwa={pwa} isNative={isNative} />
        ) : null}
      </section>

      {/* 息屏推送（仅非原生App显示） */}
      {!isNative ? (
        <section className="mb-5 biz-card rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="h-9 w-9 grid place-items-center rounded-full bg-violet/15 text-[#6b5fa8]">
                <BellRing size={16} />
              </span>
              <div>
                <div className="text-[13px] font-medium text-ink">息屏推送</div>
                <div className="mono-meta">
                  {pushStatus === "loading"
                    ? "检查中…"
                    : pushStatus === "subscribed"
                      ? "已开启"
                      : pushStatus === "no-support"
                        ? "当前环境不支持"
                        : pushStatus === "no-vapid"
                          ? "未配置"
                          : pushStatus === "no-permission"
                            ? "需先开启通知权限"
                            : "未开启"}
                </div>
              </div>
            </div>
            {pushReady && pushStatus !== "loading" ? (
              <Button
                variant={pushStatus === "subscribed" ? "secondary" : "primary"}
                size="sm"
                onClick={handleTogglePush}
                disabled={pushBusy}
              >
                {pushBusy ? "处理中…" : pushStatus === "subscribed" ? "关闭" : "开启"}
              </Button>
            ) : null}
          </div>
          {pushError ? (
            <p className="mt-3 text-[11px] text-[#a85c4a] leading-relaxed whitespace-pre-line">
              {pushError}
            </p>
          ) : null}
          {pushReady && pushStatus !== "subscribed" && !pushError ? (
            <p className="mt-3 text-[11px] text-muted leading-relaxed">
              开启后，息屏时新私信会通过系统推送送达。
            </p>
          ) : null}
        </section>
      ) : null}

      {/* 偏好开关 */}
      <section className="mb-5">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted mb-3">
          通知类型
        </h3>
        <ul className="space-y-1">
          <ToggleRow
            label="总开关"
            hint="关闭后不再弹出任何通知"
            checked={pref.enabled}
            onChange={(v) => update({ enabled: v })}
          />
          <ToggleRow
            label="新私信"
            hint="收到他人发来的私信时通知"
            checked={pref.dm}
            onChange={(v) => update({ dm: v })}
            disabled={!pref.enabled}
          />
          <ToggleRow
            label="任务被指派给我"
            hint="队长把任务指派给你时通知"
            checked={pref.assigned}
            onChange={(v) => update({ assigned: v })}
            disabled={!pref.enabled}
          />
          <ToggleRow
            label="任务变更"
            hint="任务状态被改动时通知"
            checked={pref.taskUpdated}
            onChange={(v) => update({ taskUpdated: v })}
            disabled={!pref.enabled}
          />
        </ul>
      </section>

      <section className="mb-5">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted mb-3">
          提醒方式
        </h3>
        <ToggleRow
          label="振动"
          hint="收到通知时设备振动"
          icon={<Vibrate size={14} />}
          checked={pref.vibrate}
          onChange={(v) => update({ vibrate: v })}
          disabled={!pref.enabled}
        />
      </section>

      <section className="mb-2">
        <Button
          variant="secondary"
          size="md"
          className="w-full"
          onClick={() =>
            showNotification({
              title: "🔔 测试通知",
              body: "如果你看到了这条通知，说明配置正确。",
              tag: "test",
            })
          }
          disabled={permission !== "granted" || !pref.enabled}
        >
          发送测试通知
        </Button>
      </section>
    </Drawer>
  );
}

function InstallGuide({ pwa, isNative }: { pwa: ReturnType<typeof usePwaInstall>; isNative: boolean }) {
  if (isNative) {
    return (
      <div className="biz-card rounded-lg p-3 mb-4 bg-mint-soft/40 border-mint/30">
        <div className="flex items-center gap-2">
          <Check size={14} className="text-[#4a7a68] flex-shrink-0" />
          <div className="text-[12px] text-[#3d5a4f]">
            <span className="font-medium">已在 App 中运行</span>
            <span className="text-muted ml-1">开启上方通知权限即可收到消息提醒</span>
          </div>
        </div>
      </div>
    );
  }

  if (pwa.isAndroid || pwa.isHarmonyOS) {
    return (
      <div className="biz-card rounded-lg p-3 mb-4">
        <a
          href="/office-todo.apk"
          download="待办清单.apk"
          className="flex items-center gap-3 p-3 rounded-lg bg-[#4a7a68] text-white hover:bg-[#3d6657] transition-colors"
        >
          <Smartphone size={22} className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-medium">📥 下载安卓 App</div>
            <div className="text-[11px] text-white/80">安装后消息通知更稳定（推荐）</div>
          </div>
          <Download size={18} className="flex-shrink-0" />
        </a>
      </div>
    );
  }

  if (pwa.isIOS) {
    return (
      <div className="biz-card rounded-lg p-3 mb-4 bg-mint-soft/40 border-mint/30">
        <div className="text-[12px] font-medium text-[#3d5a4f] mb-2">
          📱 iPhone 请添加到主屏幕
        </div>
        <ol className="space-y-1.5 text-[11px] text-ink leading-relaxed">
          <li className="flex gap-2">
            <span className="flex-shrink-0 h-5 w-5 grid place-items-center rounded-full bg-[#007AFF]/15 text-[#007AFF] text-[10px] font-semibold">1</span>
            <span className="flex items-center gap-1">
              点击 Safari 底部的
              <Share size={12} className="inline text-[#007AFF]" />
              分享按钮
            </span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 h-5 w-5 grid place-items-center rounded-full bg-[#007AFF]/15 text-[#007AFF] text-[10px] font-semibold">2</span>
            <span>上滑找到「添加到主屏幕」→ 点右上角「添加」</span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 h-5 w-5 grid place-items-center rounded-full bg-[#007AFF]/15 text-[#007AFF] text-[10px] font-semibold">3</span>
            <span><strong className="text-[#4a7a68]">关掉 Safari</strong>，从桌面图标打开</span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 h-5 w-5 grid place-items-center rounded-full bg-[#007AFF]/15 text-[#007AFF] text-[10px] font-semibold">4</span>
            <span>首次打开时允许通知权限</span>
          </li>
        </ol>
      </div>
    );
  }

  return null;
}

function PermissionDeniedHelp({ pwa, isNative }: { pwa: ReturnType<typeof usePwaInstall>; isNative: boolean }) {
  if (isNative) {
    return (
      <div className="mt-3 text-[11px] text-muted leading-relaxed">
        <p>请打开手机 <strong>设置</strong> → <strong>应用管理</strong> → <strong>待办清单</strong> → <strong>通知</strong>，打开「允许通知」。</p>
      </div>
    );
  }

  if (pwa.isIOS) {
    return (
      <div className="mt-3 text-[11px] text-muted leading-relaxed space-y-1">
        <p>iPhone 请按以下步骤开启：</p>
        <ol className="pl-4 space-y-0.5 list-decimal">
          <li>如果已添加到主屏幕：长按图标 → 移除 → 从主屏幕删除</li>
          <li>用 Safari 重新打开本网页</li>
          <li>点底部分享 <Share size={10} className="inline" /> → 添加到主屏幕</li>
          <li>从桌面图标打开，会弹出权限请求，点「允许」</li>
        </ol>
        <p className="text-[#a85c4a] pt-1">或检查：设置 → 通知 → 找到本 App → 打开「允许通知」</p>
      </div>
    );
  }

  if (pwa.isAndroid || pwa.isHarmonyOS) {
    return (
      <div className="mt-3 text-[11px] text-muted leading-relaxed">
        <p className="text-[#4a7a68] font-medium">💡 推荐直接下载上方安卓 App，安装后自动有通知权限</p>
        <p className="pt-1">继续用浏览器：点 ⋮ 菜单 → 设置 → 网站设置 → 通知，在「不允许」列表找到本网站改为允许。</p>
      </div>
    );
  }

  return (
    <div className="mt-3 text-[11px] text-muted leading-relaxed">
      <p>点地址栏左侧 🔒 锁图标 → 找到「通知」→ 改为「允许」，然后刷新页面。</p>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled = false,
  icon,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <li>
      <button
        onClick={() => !disabled && onChange(!checked)}
        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-bg-soft"
        }`}
        disabled={disabled}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
            {icon}
            {label}
          </div>
          {hint ? <div className="mono-meta mt-0.5">{hint}</div> : null}
        </div>
        <span
          className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
            checked ? "bg-mint-gradient" : "bg-line"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 bg-white rounded-full shadow-sm transition-transform ${
              checked ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </span>
      </button>
    </li>
  );
}
