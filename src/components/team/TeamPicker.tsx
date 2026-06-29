import { useEffect } from "react";
import { ArrowRight, LogIn, Plus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/Button";
import { useTodoStore } from "@/store/todoStore";
import { useUIStore } from "@/store/uiStore";

export function TeamPicker() {
  const open = useUIStore((s) => s.teamPickerOpen);
  const setOpen = useUIStore((s) => s.setTeamPicker);
  const setOnboarding = useUIStore((s) => s.setOnboarding);

  const myTeams = useTodoStore((s) => s.myTeams);
  const currentTeamId = useTodoStore((s) => s.currentTeamId);
  const enterTeam = useTodoStore((s) => s.enterTeam);

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

  async function handleEnter(teamId: string, memberId: string) {
    await enterTeam(teamId, memberId);
    setOpen(false);
  }

  function handleCreate() {
    setOpen(false);
    setOnboarding(true);
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
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-[fade-up_200ms_ease-out]"
      />
      <div className="relative w-full max-w-[460px] bg-white border border-slate-200 shadow-lift rounded-lg overflow-hidden animate-fade-up">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 grid place-items-center bg-blue-600 text-white rounded-lg">
              <Users size={15} />
            </div>
            <h2 className="biz-title text-[18px] text-slate-900">我的团队</h2>
          </div>
          <IconButton onClick={() => setOpen(false)} aria-label="关闭">
            <X size={18} />
          </IconButton>
        </div>

        {/* 团队列表 */}
        <div className="p-3 max-h-[320px] overflow-y-auto">
          {myTeams.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <p className="text-[13px] text-slate-500">
                你还没有加入任何团队
              </p>
              <p className="text-[12px] text-slate-400 mt-1">
                创建一个团队或使用邀请码加入
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {myTeams.map((t) => {
                const isActive = t.teamId === currentTeamId;
                return (
                  <li key={t.teamId}>
                    <button
                      onClick={() => handleEnter(t.teamId, t.myMemberId)}
                      className={`w-full flex items-center gap-3 px-3 h-14 rounded-lg text-left transition-colors border ${
                        isActive
                          ? "bg-blue-50 border-blue-200"
                          : "bg-slate-50 border-transparent hover:bg-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className="h-9 w-9 shrink-0 grid place-items-center bg-ink text-white rounded-lg">
                        <span className="font-sans font-semibold text-[14px]">
                          {Array.from(t.teamName || "?")[0] ?? "?"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-medium text-slate-900 truncate">
                            {t.teamName}
                          </span>
                          {isActive ? (
                            <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 bg-blue-100 rounded">
                              当前
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[12px] text-slate-500 truncate">
                            身份：{t.myNickname || "—"}
                          </span>
                          <span className="mono-meta text-slate-400">
                            · {t.inviteCode}
                          </span>
                        </div>
                      </div>
                      <ArrowRight size={15} className="shrink-0 text-slate-400" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={handleCreate}
            leadingIcon={<Plus size={15} />}
          >
            创建新团队
          </Button>
          <Button
            variant="primary"
            size="md"
            className="flex-1"
            onClick={handleCreate}
            leadingIcon={<LogIn size={15} />}
          >
            加入团队
          </Button>
        </div>
      </div>
    </div>
  );
}
