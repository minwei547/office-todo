import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BellRing,
  Check,
  CheckCircle2,
  Download,
  MoonStar,
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
  notificationsSupported,
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

type PushStatus =
  | "loading"
  | "subscribed"
  | "not-subscribed"
  | "no-vapid"
  | "no-permission"
  | "no-support";

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

  async function refreshPushStatus() {
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
    if (open) {
      setPermission(notificationPermission());
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
    setPermission(notificationPermission());
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
        // 先确保通知权限
        if (Notification.permission !== "granted") {
          const ok = await requestNotificationPermission();
          setPermission(notificationPermission());
          if (!ok) {
            setPushError("通知权限被拒绝，请在浏览器设置中开启");
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

  const supported = notificationsSupported();
  const pushReady = pushSupported() && vapidConfigured();

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
      subtitle="息屏后仍可在系统通知栏收到提醒"
      widthClass="w-[420px] max-w-[92vw]"
    >
      {/* 浏览器兼容性提示 */}
      <BrowserSupportBanner pwa={pwa} />

      {!supported ? (
        <div className="biz-card rounded-lg p-4 mb-4 bg-peach-soft border-peach">
          <p className="text-[13px] text-[#a85c4a] leading-relaxed">
            当前环境不支持系统通知 API。
            请在 Chrome / Edge / Safari 中打开，或安装为 PWA 后使用。
          </p>
        </div>
      ) : null}

      {/* 权限状态 */}
      <section className="mb-5 biz-card rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="h-9 w-9 grid place-items-center rounded-full bg-mint-soft text-[#4a7a68]">
              <Bell size={16} />
            </span>
            <div>
              <div className="text-[13px] font-medium text-ink">系统通知权限</div>
              <div className="mono-meta">
                {supported
                  ? permission === "granted"
                    ? "已授权 · 可接收通知"
                    : permission === "denied"
                      ? "已被拒绝 · 需在浏览器设置中恢复"
                      : "未授权"
                  : "当前环境不支持"}
              </div>
            </div>
          </div>
          {supported && permission !== "granted" ? (
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
        {supported && permission === "denied" ? (
          <p className="mt-3 text-[11px] text-[#a85c4a] leading-relaxed">
            权限被拒后无法在网页中再次申请。
            请到浏览器地址栏左侧的🔒图标 → 通知 → 允许，重新开启。
          </p>
        ) : null}
      </section>

      {/* 息屏推送（Web Push） */}
      <section className="mb-5 biz-card rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="h-9 w-9 grid place-items-center rounded-full bg-violet/15 text-[#6b5fa8]">
              <MoonStar size={16} />
            </span>
            <div>
              <div className="text-[13px] font-medium text-ink">息屏推送</div>
              <div className="mono-meta">
                {pushStatus === "loading"
                  ? "检查中…"
                  : pushStatus === "subscribed"
                    ? "已开启 · 息屏也能收到"
                    : pushStatus === "no-support"
                      ? "当前环境不支持"
                      : pushStatus === "no-vapid"
                        ? "服务器未配置"
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
              {pushBusy
                ? "处理中…"
                : pushStatus === "subscribed"
                  ? "关闭"
                  : "开启"}
            </Button>
          ) : null}
        </div>
        {pushError ? (
          <p className="mt-3 text-[11px] text-[#a85c4a] leading-relaxed">
            {pushError}
          </p>
        ) : null}
        {pushReady && pushStatus !== "subscribed" ? (
          <p className="mt-3 text-[11px] text-muted leading-relaxed">
            开启后，即使 App 在后台或手机息屏，新私信也会通过系统推送送达。
          </p>
        ) : null}
        {pushStatus === "no-vapid" ? (
          <p className="mt-3 text-[11px] text-muted leading-relaxed">
            前端尚未配置 VAPID 公钥。请管理员在部署平台配置环境变量
            <code className="mx-1 px-1 bg-bg-soft rounded text-[10px]">
              VITE_VAPID_PUBLIC_KEY
            </code>
            后重新部署（本地开发写入
            <code className="mx-1 px-1 bg-bg-soft rounded text-[10px]">
              .env.local
            </code>
            即可）。
          </p>
        ) : null}
        {pushStatus === "no-support" ? (
          <p className="mt-3 text-[11px] text-muted leading-relaxed">
            当前浏览器不支持 Web Push。iOS 需 Safari 16.4+ 并「添加到主屏幕」；
            Android 需安装 PWA 或使用 Chrome。
          </p>
        ) : null}
      </section>

      {/* 偏好开关 */}
      <section className="mb-5">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted mb-3">
          通知类型
        </h3>
        <ul className="space-y-1">
          <ToggleRow
            label="总开关"
            hint="关闭后将不再弹出任何通知"
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
            label="我负责的任务变更"
            hint="任务状态/进度被改动时通知（可能较吵）"
            checked={pref.taskUpdated}
            onChange={(v) => update({ taskUpdated: v })}
            disabled={!pref.enabled}
          />
        </ul>
      </section>

      {/* 振动 */}
      <section className="mb-5">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted mb-3">
          提醒方式
        </h3>
        <ToggleRow
          label="振动"
          hint="收到通知时设备振动（仅移动端）"
          icon={<Vibrate size={14} />}
          checked={pref.vibrate}
          onChange={(v) => update({ vibrate: v })}
          disabled={!pref.enabled}
        />
      </section>

      {/* 测试 */}
      <section className="mb-5">
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
          disabled={!supported || permission !== "granted" || !pref.enabled}
        >
          发送测试通知
        </Button>
      </section>

      {/* PWA 安装引导 */}
      <section className="biz-card rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Smartphone size={14} className="text-[#4a7a68]" />
          <h4 className="text-[13px] font-medium text-ink">安装为 App</h4>
          {pwa.installed ? (
            <span className="ml-auto flex items-center gap-1 text-[11px] text-[#4a7a68]">
              <Check size={12} /> 已安装
            </span>
          ) : null}
        </div>

        {/* 已安装 */}
        {pwa.installed ? (
          <p className="text-[12px] text-muted leading-relaxed">
            当前正以独立 App 模式运行，息屏后通知能稳定送达系统通知栏。
          </p>
        ) : pwa.canPrompt ? (
          /* Android Chrome / 桌面 Chromium：一键安装 */
          <div>
            <p className="text-[12px] text-muted leading-relaxed mb-3">
              一键安装到桌面，获得独立窗口、桌面图标，息屏后通知更稳定。
            </p>
            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => pwa.promptInstall()}
              disabled={pwa.installing}
              trailingIcon={<Download size={14} />}
            >
              {pwa.installing ? "安装中…" : "一键安装 App"}
            </Button>
          </div>
        ) : pwa.isIOS ? (
          /* iOS：手动分步引导 */
          <div>
            <p className="text-[12px] text-muted leading-relaxed mb-3">
              iPhone 需手动添加到主屏幕，之后从桌面图标打开才能收到推送。
            </p>
            <ol className="space-y-2 text-[12px] text-ink leading-relaxed">
              <li className="flex gap-2">
                <span className="flex-shrink-0 h-5 w-5 grid place-items-center rounded-full bg-mint-soft text-[#4a7a68] text-[11px] font-semibold">1</span>
                <span className="flex items-center gap-1">
                  点击 Safari 底部的
                  <Share size={13} className="inline text-[#4a7a68]" />
                  分享按钮
                </span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 h-5 w-5 grid place-items-center rounded-full bg-mint-soft text-[#4a7a68] text-[11px] font-semibold">2</span>
                <span>滑动列表，选择「添加到主屏幕」</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 h-5 w-5 grid place-items-center rounded-full bg-mint-soft text-[#4a7a68] text-[11px] font-semibold">3</span>
                <span>点右上角「添加」，返回桌面</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 h-5 w-5 grid place-items-center rounded-full bg-mint-soft text-[#4a7a68] text-[11px] font-semibold">4</span>
                <span>
                  <strong className="text-[#4a7a68]">关掉 Safari</strong>，
                  从桌面图标打开，再回来开启上方通知
                </span>
              </li>
            </ol>
          </div>
        ) : (
          /* 桌面 Firefox / 其他浏览器：通用引导 */
          <div>
            <p className="text-[12px] text-muted leading-relaxed mb-2">
              安装后可获得独立窗口、桌面图标，息屏后通知也能在系统通知栏弹出。
            </p>
            <ul className="text-[11px] text-muted leading-relaxed list-disc pl-4 space-y-0.5">
              <li>Chrome/Edge：地址栏右侧安装图标</li>
              <li>Firefox：菜单 → 安装此站点为应用</li>
            </ul>
          </div>
        )}
      </section>
    </Drawer>
  );
}

/** 浏览器兼容性提示横幅 */
function BrowserSupportBanner({
  pwa,
}: {
  pwa: ReturnType<typeof usePwaInstall>;
}) {
  const [support, setSupport] = useState<
    "supported" | "wechat" | "qq" | "ios-non-safari" | "old-ios" | "unknown"
  >("supported");

  useEffect(() => {
    setSupport(pwa.checkBrowserSupport());
  }, [pwa]);

  // 已安装的 PWA 不显示提示
  if (pwa.installed) return null;

  if (support === "supported") {
    // 浏览器支持，显示绿色提示
    return (
      <div className="biz-card rounded-lg p-3 mb-4 bg-mint-soft/40 border-mint/30 flex items-start gap-2">
        <CheckCircle2 size={14} className="text-[#4a7a68] mt-0.5 flex-shrink-0" />
        <div className="text-[12px] text-[#3d5a4f] leading-relaxed">
          <span className="font-medium">当前浏览器支持息屏推送</span>
          <span className="text-muted ml-1">·</span>
          <span className="text-muted ml-1">
            建议安装为 App，息屏后通知更稳定
          </span>
        </div>
      </div>
    );
  }

  // 不支持的浏览器，显示警告 + 替代方案
  const config: Record<
    string,
    { title: string; body: string; action: string }
  > = {
    wechat: {
      title: "微信内不支持推送",
      body: "微信内置浏览器屏蔽了 Service Worker 和推送 API，无法收到息屏通知。",
      action: "点右上角 ⋯ → 在浏览器中打开，用系统浏览器继续。",
    },
    qq: {
      title: "QQ 浏览器内不支持推送",
      body: "QQ 浏览器屏蔽了推送 API，无法收到息屏通知。",
      action: "请复制链接到 Chrome / Edge / Safari 中打开。",
    },
    "ios-non-safari": {
      title: "iPhone 需用 Safari",
      body: "iOS 上 Chrome / Edge / Firefox 都不支持 Web Push，只有 Safari 支持。",
      action: "请复制链接到 Safari 打开，并「添加到主屏幕」后从图标启动。",
    },
    "old-ios": {
      title: "iOS 版本过低",
      body: "iOS 16.4 以上才支持 Web Push 通知。",
      action: "请到 设置 → 通用 → 软件更新 升级 iOS 后再试。",
    },
    unknown: {
      title: "浏览器兼容性未知",
      body: "无法确认当前浏览器是否支持息屏推送。",
      action: "推荐使用 Chrome / Edge / Safari 打开本网站。",
    },
  };

  const c = config[support] || config.unknown;

  return (
    <div className="biz-card rounded-lg p-3 mb-4 bg-peach-soft border-peach flex items-start gap-2">
      <AlertTriangle size={14} className="text-[#a85c4a] mt-0.5 flex-shrink-0" />
      <div className="text-[12px] leading-relaxed">
        <div className="font-medium text-[#a85c4a]">{c.title}</div>
        <div className="text-[#7a4a3d] mt-0.5">{c.body}</div>
        <div className="text-[#a85c4a] mt-1 flex items-start gap-1">
          <ArrowRight size={11} className="mt-0.5 flex-shrink-0" />
          <span>{c.action}</span>
        </div>
      </div>
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
          {hint ? (
            <div className="mono-meta mt-0.5">{hint}</div>
          ) : null}
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
