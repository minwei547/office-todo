import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Link2, QrCode, X } from "lucide-react";
import { IconButton, Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import {
  useTodoStore,
  selectCurrentTeam,
  selectCurrentMember,
} from "@/store/todoStore";
import { useUIStore } from "@/store/uiStore";

interface ShareTeamModalProps {
  open: boolean;
  onClose: () => void;
}

export function ShareTeamModal({ open, onClose }: ShareTeamModalProps) {
  const team = useTodoStore(selectCurrentTeam);
  const member = useTodoStore(selectCurrentMember);
  const [copied, setCopied] = useState<"code" | "url" | "both" | null>(null);
  const [shareUrl, setShareUrl] = useState("");

  // 当前页 URL（同事打开后看到的同一个地址）
  useEffect(() => {
    if (open) {
      setShareUrl(window.location.href);
    }
  }, [open]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // QR 码图片 URL：用一个公开 QR 接口（无需依赖）
  const qrSrc = useMemo(() => {
    if (!shareUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(
      shareUrl,
    )}`;
  }, [shareUrl]);

  if (!open) return null;

  // 完整邀请链接：把邀请码塞进 URL，同事打开后自动填入
  const inviteLink = team
    ? `${shareUrl.split("?")[0]}?invite=${team.inviteCode}`
    : shareUrl;

  function copy(text: string, key: "code" | "url" | "both") {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        aria-label="关闭"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] animate-[fade-up_200ms_ease-out]"
      />
      <div className="relative w-full max-w-[440px] bg-slate-50 border border-slate-300/20 shadow-lift rounded-lg overflow-hidden animate-fade-up">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-300/10">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 grid place-items-center bg-ink text-white rounded-lg">
              <Link2 size={13} />
            </div>
            <h2 className="biz-title text-[18px]">邀请同事加入</h2>
          </div>
          <IconButton onClick={onClose} aria-label="关闭">
            <X size={18} />
          </IconButton>
        </div>

        <div className="p-6 space-y-5">
          {team ? (
            <>
              {/* 邀请码 + 团队名 */}
              <section className="biz-card rounded-lg p-4">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted mb-2">
                  团队
                </div>
                <div className="font-sans text-[18px] text-slate-900 mb-3">
                  {team.teamName}
                </div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted mb-1.5">
                  邀请码
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[26px] tracking-[0.4em] font-semibold text-slate-900">
                    {team.inviteCode}
                  </span>
                  <button
                    onClick={() => copy(team.inviteCode, "code")}
                    aria-label="复制邀请码"
                    className="text-muted hover:text-slate-900 p-1"
                  >
                    {copied === "code" ? (
                      <Check size={16} className="text-success" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>
                <p className="mono-meta mt-2">
                  同事打开下方网址后，输入这 6 位邀请码 + 昵称即可加入
                </p>
              </section>

              {/* 二维码 */}
              <section className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-3 text-[11px] font-medium uppercase tracking-wider text-muted">
                  <QrCode size={12} /> 扫码加入（手机直接扫）
                </div>
                <div className="inline-block p-3 bg-slate-50 border border-slate-300/15 rounded-lg">
                  {qrSrc ? (
                    <img
                      src={qrSrc}
                      alt="二维码"
                      width={220}
                      height={220}
                      className="block"
                    />
                  ) : (
                    <div className="w-[220px] h-[220px] grid place-items-center bg-chip/40">
                      <span className="mono-meta">生成中…</span>
                    </div>
                  )}
                </div>
                <p className="mono-meta mt-2">
                  扫码后浏览器会打开这个网址
                </p>
              </section>

              {/* 完整邀请链接 */}
              <section>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-muted">
                    完整邀请链接
                  </label>
                  <button
                    onClick={() => copy(inviteLink, "url")}
                    className="text-[11px] text-muted hover:text-slate-900 flex items-center gap-1"
                  >
                    {copied === "url" ? (
                      <>
                        <Check size={11} className="text-success" /> 已复制
                      </>
                    ) : (
                      <>
                        <Copy size={11} /> 复制链接
                      </>
                    )}
                  </button>
                </div>
                <TextInput
                  value={inviteLink}
                  readOnly
                  onFocus={(e) => e.currentTarget.select()}
                  className="text-[12px] font-mono"
                />
                <p className="mono-meta mt-1">
                  发到工作群，同事点开即可看到团队邀请码
                </p>
              </section>

              {/* 当前昵称 */}
              {member ? (
                <p className="text-center text-[11px] text-muted border-t border-slate-300/10 pt-3">
                  当前身份：{member.nickname} · 已加入团队
                </p>
              ) : null}
            </>
          ) : (
            <div className="text-center text-[13px] text-muted py-6">
              请先创建或加入团队
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => {
              if (inviteLink) copy(inviteLink, "both");
            }}
            leadingIcon={<Link2 size={15} />}
          >
            {copied === "both" ? "已复制完整邀请链接" : "一键复制邀请链接"}
          </Button>
        </div>
      </div>
    </div>
  );
}
