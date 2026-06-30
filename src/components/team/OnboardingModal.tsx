import { useEffect, useState } from "react";
import { ArrowRight, Plus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { useTodoStore } from "@/store/todoStore";
import { useUIStore } from "@/store/uiStore";

type Tab = "create" | "join";

export function OnboardingModal() {
  const open = useUIStore((s) => s.onboardingOpen);
  const setOpen = useUIStore((s) => s.setOnboarding);

  const createTeam = useTodoStore((s) => s.createTeam);
  const joinTeam = useTodoStore((s) => s.joinTeam);
  // 防御性守卫：登录/加载期间禁止创建/加入团队，避免重复身份
  const authLoading = useTodoStore((s) => s.authLoading);

  const [tab, setTab] = useState<Tab>("create");
  const [nickname, setNickname] = useState("");
  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 重置表单 + 从 URL 自动读取邀请码（同事点开邀请链接时）
  useEffect(() => {
    if (!open) {
      setError("");
      setSubmitting(false);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("invite");
    if (invite) {
      setInviteCode(invite.toUpperCase().slice(0, 6));
      setTab("join");
    }
  }, [open]);

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
    if (authLoading) {
      setError("正在登录/加载中，请稍候再试");
      return;
    }
    const nick = nickname.trim();
    if (!nick) {
      setError("请先填写你的昵称");
      return;
    }
    setSubmitting(true);
    try {
      if (tab === "create") {
        const name = teamName.trim();
        if (!name) {
          setError("请填写团队名称");
          setSubmitting(false);
          return;
        }
        await createTeam(name, nick);
        setOpen(false);
        setNickname("");
        setTeamName("");
      } else {
        const code = inviteCode.trim().toUpperCase();
        if (code.length !== 6) {
          setError("邀请码为 6 位字符");
          setSubmitting(false);
          return;
        }
        await joinTeam(code, nick);
        setOpen(false);
        setNickname("");
        setInviteCode("");
      }
    } catch (e: any) {
      setError(e.message ?? "操作失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
      <button
        aria-label="关闭"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-[rgba(220,220,230,0.4)] backdrop-blur-md animate-[fade-up_200ms_ease-out]"
      />
      <div className="relative w-full max-w-[460px] bg-surface/95 border border-line shadow-lift rounded-xl overflow-hidden animate-fade-up backdrop-blur-xl">
        {/* 顶部光带 */}
        <div className="absolute inset-x-0 top-0 h-px bg-mint-gradient opacity-80" />
        {/* 渐变光晕 */}
        <div className="pointer-events-none absolute -top-20 -left-20 w-60 h-60 rounded-full bg-mint-soft blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 w-60 h-60 rounded-full bg-violet/15 blur-3xl" />

        <div className="relative">
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-line">
            <div>
              <div className="flex items-center gap-2">
                <div className="relative h-7 w-7">
                  <div className="absolute inset-0 rounded-lg bg-mint-gradient opacity-60 blur-[4px]" />
                  <div className="relative h-7 w-7 grid place-items-center bg-mint-gradient text-white rounded-lg">
                    <span className="font-sans font-semibold text-[13px]">协</span>
                  </div>
                </div>
                <h2 className="biz-title text-[20px] text-ink">
                  办公协作待办清单
                </h2>
              </div>
              <p className="text-[12px] text-muted mt-1 ml-9">
                一张共享清单，让全队知道"谁在做什么、什么还没做"
              </p>
            </div>
            <IconButton onClick={() => setOpen(false)} aria-label="关闭">
              <X size={18} />
            </IconButton>
          </div>

          {/* Tab 切换 */}
          <div className="flex border-b border-line">
            <TabButton
              active={tab === "create"}
              onClick={() => setTab("create")}
              icon={<Plus size={14} />}
              label="创建团队"
            />
            <TabButton
              active={tab === "join"}
              onClick={() => setTab("join")}
              icon={<Users size={14} />}
              label="加入团队"
            />
          </div>

          <div className="p-6 space-y-4">
            {/* 昵称 */}
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted block mb-1.5">
                你的昵称
              </label>
              <TextInput
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="例如：林溪、设计·阿岚"
                autoFocus
                maxLength={20}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
              />
              <p className="text-[11px] text-dim mt-1">将作为你在该团队中的身份标识</p>
            </div>

            {tab === "create" ? (
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-muted block mb-1.5">
                  团队名称
                </label>
                <TextInput
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="例如：行政事务组、产品迭代 2026"
                  maxLength={32}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit();
                  }}
                />
                <p className="text-[11px] text-dim mt-1">
                  创建后将生成 6 位邀请码，可分享给同事
                </p>
              </div>
            ) : (
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-muted block mb-1.5">
                  团队邀请码
                </label>
                <input
                  value={inviteCode}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase().slice(0, 6);
                    setInviteCode(v);
                  }}
                  placeholder="ABCDEF"
                  maxLength={6}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit();
                  }}
                  className="w-full bg-bg-soft border border-line px-3 h-12 text-[20px] tracking-[0.5em] font-mono font-medium text-center text-ink placeholder:text-dim rounded-lg focus:outline-none focus:border-mint focus:ring-1 focus:ring-mint/50"
                />
                <p className="text-[11px] text-dim mt-1">
                  向团队所有者索取 6 位邀请码
                </p>
              </div>
            )}

            {error ? (
              <div className="px-3 py-2 text-[12px] text-[#a85c4a] bg-peach-soft border border-peach/30 rounded-lg">
                {error}
              </div>
            ) : null}

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={submit}
              disabled={submitting || authLoading}
              trailingIcon={<ArrowRight size={15} />}
            >
              {submitting
                ? "处理中…"
                : authLoading
                  ? "正在登录…"
                  : tab === "create"
                    ? "创建并进入团队"
                    : "加入团队"}
            </Button>

            <p className="text-center text-[12px] text-dim">
              数据存储于云端，团队所有成员将看到同一份清单
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
          ? "border-mint text-ink"
          : "border-transparent text-dim hover:text-muted"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
