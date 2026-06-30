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
  const [preNotify, setPreNotify] = useState(false);

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
      setPreNotify(false);
      refreshPushStatus();
    }
  }, [open]);

  function update(patch: Partial<NotificationPref>) {
    const next = { ...pref, ...patch };
    setPref(next);
    savePref(next);
  }

  async function handleEnable() {
    // 如果还没显示过预提示，先显示，用户确认后再真正请求权限
    if (!preNotify && permission === "default") {
      setPreNotify(true);
      return;
    }
    setPreNotify(false);
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

      {/* 开启通知预提示 */}
      {preNotify ? (
        <div className="biz-card rounded-lg p-4 mb-4 bg-accent/10 border-accent/30">
          <div className="flex items-start gap-2.5">
            <BellRing size={16} className="text-[#4a7a68] mt-0.5 flex-shrink-0" />
            <div className="text-[12px] leading-relaxed">
              <div className="font-medium text-ink mb-1">即将弹出权限请求</div>
              <div className="text-muted mb-3">
                点击下方"好的，去开启"后，浏览器会弹出一个系统对话框，
                请点<strong className="text-[#4a7a68]">「允许」</strong>才能收到通知。
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleEnable}
                >
                  好的，去开启
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPreNotify(false)}
                >
                  取消
                </Button>
              </div>
            </div>
          </div>
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
          <div className="mt-3">
            <p className="text-[11px] text-[#a85c4a] leading-relaxed mb-2">
              通知权限被拒绝，需手动开启：
            </p>
            {pwa.isIOS ? (
              <IosPermissionGuide installed={pwa.installed} />
            ) : pwa.isAndroid || pwa.isHarmonyOS ? (
              <AndroidPermissionGuide isEdge={pwa.isEdge} />
            ) : (
              <div className="text-[11px] text-muted leading-relaxed space-y-1 pl-1">
                <p>💻 电脑端：</p>
                <ol className="pl-4 space-y-0.5 list-decimal">
                  <li>点地址栏 <strong>左侧</strong> 的 🔒 锁图标</li>
                  <li>找到「通知」下拉选项，改为「允许」</li>
                  <li>刷新页面即可</li>
                </ol>
              </div>
            )}
          </div>
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
          <p className="mt-3 text-[11px] text-[#a85c4a] leading-relaxed whitespace-pre-line">
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

        {pwa.installed ? (
          <p className="text-[12px] text-muted leading-relaxed">
            当前正以独立 App 模式运行，息屏后通知能稳定送达系统通知栏。
          </p>
        ) : (pwa.isAndroid || pwa.isHarmonyOS) ? (
          <p className="text-[12px] text-muted leading-relaxed">
            请在上方点击绿色按钮下载安卓 App 安装包，安装后通知更稳定。
          </p>
        ) : pwa.isIOS ? (
          <p className="text-[12px] text-muted leading-relaxed">
            请按上方步骤添加到主屏幕，添加后从桌面图标打开即可。
          </p>
        ) : pwa.canPrompt ? (
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
        ) : (
          <p className="text-[12px] text-muted leading-relaxed">
            Chrome/Edge：点地址栏右侧安装图标；Firefox：菜单 → 安装此站点为应用。
          </p>
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

  if (pwa.installed) return null;

  if (support !== "supported") {
    const config: Record<
      string,
      { title: string; action: string }
    > = {
      wechat: {
        title: "微信内不支持通知",
        action: "点右上角 ⋯ → 在浏览器中打开",
      },
      qq: {
        title: "QQ 浏览器内不支持通知",
        action: "请复制链接到系统浏览器中打开",
      },
      "ios-non-safari": {
        title: "iPhone 需用 Safari 浏览器",
        action: "请复制链接到 Safari 打开",
      },
      "old-ios": {
        title: "iOS 版本过低",
        action: "iOS 16.4 以上才支持推送，请升级系统",
      },
      unknown: {
        title: "当前浏览器兼容性未知",
        action: "推荐使用系统浏览器打开",
      },
    };

    const c = config[support] || config.unknown;

    return (
      <div className="biz-card rounded-lg p-3 mb-4 bg-peach-soft border-peach flex items-start gap-2">
        <AlertTriangle size={14} className="text-[#a85c4a] mt-0.5 flex-shrink-0" />
        <div className="text-[12px] leading-relaxed">
          <div className="font-medium text-[#a85c4a]">{c.title}</div>
          <div className="text-[#a85c4a] mt-1 flex items-start gap-1">
            <ArrowRight size={11} className="mt-0.5 flex-shrink-0" />
            <span>{c.action}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="biz-card rounded-lg p-3 mb-4 bg-mint-soft/40 border-mint/30">
      {/* 安卓/鸿蒙：优先推 APK */}
      {(pwa.isAndroid || pwa.isHarmonyOS) ? (
        <a
          href="/office-todo.apk"
          download="待办清单.apk"
          className="flex items-center gap-3 p-3 rounded-lg bg-[#4a7a68] text-white hover:bg-[#3d6657] transition-colors"
        >
          <Smartphone size={20} className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium">📥 下载安卓 App（推荐）</div>
            <div className="text-[11px] text-white/80">安装后息屏通知更稳定，无需折腾浏览器</div>
          </div>
          <Download size={16} className="flex-shrink-0" />
        </a>
      ) : pwa.isIOS ? (
        /* iOS：Safari 添加到主屏幕指引 */
        <div>
          <div className="flex items-start gap-2 mb-2">
            <CheckCircle2 size={14} className="text-[#4a7a68] mt-0.5 flex-shrink-0" />
            <div className="text-[12px] text-[#3d5a4f] leading-relaxed">
              <span className="font-medium">iPhone 请添加到主屏幕</span>
              <span className="text-muted">，添加后才能收到息屏通知</span>
            </div>
          </div>
          <ol className="space-y-1.5 text-[11px] text-ink leading-relaxed pl-1">
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
              <span>上滑找到「添加到主屏幕」，点右上角「添加」</span>
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0 h-5 w-5 grid place-items-center rounded-full bg-[#007AFF]/15 text-[#007AFF] text-[10px] font-semibold">3</span>
              <span><strong className="text-[#4a7a68]">关掉 Safari</strong>，从桌面图标打开，再回来开启通知</span>
            </li>
          </ol>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <CheckCircle2 size={14} className="text-[#4a7a68] mt-0.5 flex-shrink-0" />
          <div className="text-[12px] text-[#3d5a4f] leading-relaxed flex-1">
            <span className="font-medium">当前浏览器支持通知</span>
            <span className="text-muted ml-1">·开启通知即可在息屏后收到消息提醒</span>
          </div>
        </div>
      )}
    </div>
  );
}

function IosPermissionGuide({ installed }: { installed: boolean }) {
  if (installed) {
    return (
      <div className="text-[11px] text-muted leading-relaxed space-y-1 pl-1">
        <p>📱 请按以下步骤恢复：</p>
        <ol className="pl-4 space-y-0.5 list-decimal">
          <li>长按桌面本 App 图标 → 移除 App → 从主屏幕删除</li>
          <li>用 Safari 重新打开本网站</li>
          <li>点底部分享 <Share size={10} className="inline" /> →「添加到主屏幕」→ 添加</li>
          <li>从桌面图标打开，会弹出权限请求，点「允许」</li>
        </ol>
        <p className="pt-1">或检查：设置 → 通知 → 找到本 App → 打开「允许通知」</p>
      </div>
    );
  }
  return (
    <div className="text-[11px] text-muted leading-relaxed space-y-1 pl-1">
      <p>📱 请先按上方指引「添加到主屏幕」，然后：</p>
      <ol className="pl-4 space-y-0.5 list-decimal">
        <li><strong>关掉 Safari</strong>，从桌面图标打开本 App</li>
        <li>打开后会自动弹出权限请求，点「允许」</li>
      </ol>
      <p className="text-[#a85c4a] pt-1">⚠️ 必须从桌面图标启动，Safari 直接打开网页无法收到推送</p>
    </div>
  );
}

function AndroidPermissionGuide({ isEdge }: { isEdge: boolean }) {
  return (
    <div className="text-[11px] text-muted leading-relaxed space-y-1 pl-1">
      <p className="text-[#4a7a68] font-medium">💡 推荐直接下载上方安卓 App，安装后通知不受浏览器限制</p>
      {isEdge ? (
        <p className="text-[#a85c4a]">Edge 用户：先在 ⋮ → 设置 → 网站权限 → 通知，关闭「安静通知请求」</p>
      ) : null}
      <p>继续用浏览器的话：点浏览器 ⋮ → 设置 → 网站设置 → 通知，在「不允许」列表找到本网站改为允许。</p>
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
