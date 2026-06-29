import { useEffect, useState } from "react";
import { ArrowRight, KeyRound, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { useTodoStore } from "@/store/todoStore";
import { useUIStore } from "@/store/uiStore";

export function AuthModal() {
  const open = useUIStore((s) => s.authModalOpen);
  const setOpen = useUIStore((s) => s.setAuthModal);
  const tab = useUIStore((s) => s.authTab);
  const setTab = useUIStore((s) => s.setAuthTab);

  const login = useTodoStore((s) => s.login);
  const register = useTodoStore((s) => s.register);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 切换 Tab / 关闭时重置表单
  useEffect(() => {
    if (!open) {
      setError("");
      setSubmitting(false);
    }
  }, [open, tab]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  async function submit() {
    setError("");
    setSubmitting(true);
    try {
      if (tab === "register") {
        await register(username, password, nickname);
      } else {
        await login(username, password);
      }
      setOpen(false);
      setUsername("");
      setPassword("");
      setNickname("");
    } catch (e: any) {
      setError(e.message ?? "操作失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        aria-label="关闭"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/70 backdrop-blur-md animate-[fade-up_200ms_ease-out]"
      />
      <div className="relative w-full max-w-[420px] bg-bg-soft/90 border border-white/[0.10] shadow-lift rounded-xl overflow-hidden animate-fade-up backdrop-blur-xl">
        {/* 顶部装饰光带 */}
        <div className="absolute inset-x-0 top-0 h-px bg-accent-gradient opacity-80" />
        {/* 渐变光晕 */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-60 h-60 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-violet/15 blur-3xl" />

        <div className="relative">
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div className="relative h-7 w-7">
                <div className="absolute inset-0 rounded-lg bg-accent-gradient opacity-60 blur-[4px]" />
                <div className="relative h-7 w-7 grid place-items-center bg-accent-gradient text-white rounded-lg">
                  <span className="font-sans font-semibold text-[13px]">协</span>
                </div>
              </div>
              <h2 className="biz-title text-[18px] text-ink">
                {tab === "register" ? "注册账号" : "登录账号"}
              </h2>
            </div>
            <IconButton onClick={() => setOpen(false)} aria-label="关闭">
              <X size={18} />
            </IconButton>
          </div>

          {/* Tab 切换 */}
          <div className="flex border-b border-white/[0.06]">
            <TabButton
              active={tab === "login"}
              onClick={() => setTab("login")}
              icon={<KeyRound size={14} />}
              label="登录"
            />
            <TabButton
              active={tab === "register"}
              onClick={() => setTab("register")}
              icon={<UserPlus size={14} />}
              label="注册"
            />
          </div>

          <div className="p-6 space-y-4">
            {/* 账号 */}
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted block mb-1.5">
                账号
              </label>
              <TextInput
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="字母 / 数字，至少 2 位"
                autoFocus
                maxLength={24}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
              />
            </div>

            {/* 密码 */}
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted block mb-1.5">
                密码
              </label>
              <TextInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 4 位"
                maxLength={64}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
              />
            </div>

            {/* 注册需要昵称 */}
            {tab === "register" ? (
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-muted block mb-1.5">
                  昵称
                </label>
                <TextInput
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="例如：林溪、设计·阿岚"
                  maxLength={20}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit();
                  }}
                />
                <p className="text-[11px] text-dim mt-1">
                  作为你的默认身份标识，加入团队时可单独设置
                </p>
              </div>
            ) : null}

            {error ? (
              <div className="px-3 py-2 text-[12px] text-danger bg-danger/10 border border-danger/30 rounded-lg">
                {error}
              </div>
            ) : null}

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={submit}
              disabled={submitting}
              trailingIcon={<ArrowRight size={15} />}
            >
              {submitting
                ? "处理中…"
                : tab === "register"
                  ? "注册并登录"
                  : "登录"}
            </Button>

            <p className="text-center text-[12px] text-dim">
              {tab === "register" ? (
                <button
                  type="button"
                  className="text-accent-soft hover:underline"
                  onClick={() => setTab("login")}
                >
                  已有账号？去登录
                </button>
              ) : (
                <button
                  type="button"
                  className="text-accent-soft hover:underline"
                  onClick={() => setTab("register")}
                >
                  还没账号？去注册
                </button>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 h-10 text-[13px] font-medium border-b-2 transition-colors ${
        active
          ? "border-accent text-ink"
          : "border-transparent text-dim hover:text-muted"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
