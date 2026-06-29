import { useEffect, useState } from "react";
import { Bell, BellRing, Smartphone, Vibrate } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { useUIStore } from "@/store/uiStore";
import {
  loadPref,
  savePref,
  requestNotificationPermission,
  notificationPermission,
  notificationsSupported,
  showNotification,
  type NotificationPref,
} from "@/lib/notify";

export function NotifyDrawer() {
  const open = useUIStore((s) => s.notifyDrawerOpen);
  const setOpen = useUIStore((s) => s.setNotifyDrawer);
  const [pref, setPref] = useState<NotificationPref>(loadPref());
  const [permission, setPermission] = useState<NotificationPermission>(
    notificationPermission(),
  );

  useEffect(() => {
    if (open) setPermission(notificationPermission());
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
      // 测试通知
      showNotification({
        title: "✅ 通知已开启",
        body: "新私信和任务指派会在此弹出",
        tag: "test",
      });
    }
  }

  const supported = notificationsSupported();

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

      {/* PWA 安装提示 */}
      <section className="biz-card rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Smartphone size={14} className="text-[#4a7a68]" />
          <h4 className="text-[13px] font-medium text-ink">安装为 App</h4>
        </div>
        <p className="text-[12px] text-muted leading-relaxed">
          在浏览器地址栏或菜单中选择「安装此应用 / 添加到主屏幕」，
          可获得独立窗口、桌面图标，息屏后通知也能在系统通知栏弹出。
        </p>
        <ul className="mt-2 text-[11px] text-muted leading-relaxed list-disc pl-4 space-y-0.5">
          <li>桌面 Chrome/Edge：地址栏右侧安装图标</li>
          <li>Android Chrome：菜单 → 添加到主屏幕</li>
          <li>iOS Safari（16.4+）：分享 → 添加到主屏幕</li>
        </ul>
      </section>
    </Drawer>
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
