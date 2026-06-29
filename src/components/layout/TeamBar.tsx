import {
  LogOut,
  MessageSquare,
  HelpCircle,
  RefreshCw,
  Settings,
  Share2,
  Shuffle,
} from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import {
  useTodoStore,
  selectCurrentTeam,
  selectCurrentMember,
  selectUnreadCount,
} from "@/store/todoStore";
import { useUIStore } from "@/store/uiStore";

export function TeamBar() {
  const team = useTodoStore(selectCurrentTeam);
  const member = useTodoStore(selectCurrentMember);
  const unread = useTodoStore(selectUnreadCount);
  const refreshTeam = useTodoStore((s) => s.refreshTeam);
  const currentTeamId = useTodoStore((s) => s.currentTeamId);
  const user = useTodoStore((s) => s.user);
  const myTeams = useTodoStore((s) => s.myTeams);
  const logout = useTodoStore((s) => s.logout);
  const setTeamDrawer = useUIStore((s) => s.setTeamDrawer);
  const setOnboarding = useUIStore((s) => s.setOnboarding);
  const setDMDrawer = useUIStore((s) => s.setDMDrawer);
  const setHelpDrawer = useUIStore((s) => s.setHelpDrawer);
  const setShareTeam = useUIStore((s) => s.setShareTeam);
  const setTeamPicker = useUIStore((s) => s.setTeamPicker);

  function handleRefresh() {
    if (currentTeamId) refreshTeam(currentTeamId);
  }

  // 显示昵称：优先账号昵称，回退到当前团队成员昵称
  const displayName = user?.nickname || member?.nickname || "";
  const displayChar = member?.avatarChar || displayName.slice(0, 1) || "?";

  return (
    <header className="relative flex items-center gap-3 px-5 h-14 bg-bg-soft/60 border-b border-white/[0.06] backdrop-blur-xl">
      {/* 左：Logo + 团队名 */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative h-7 w-7 shrink-0">
          <div className="absolute inset-0 rounded-lg bg-accent-gradient opacity-60 blur-[6px]" />
          <div className="relative h-7 w-7 grid place-items-center bg-accent-gradient text-white rounded-lg shadow-glow">
            <span className="font-sans font-semibold text-[14px] leading-none">辑</span>
          </div>
        </div>
        <h1 className="biz-title text-[18px] text-ink truncate max-w-[260px]">
          {team?.teamName ?? "未加入团队"}
        </h1>
        {team ? (
          <span className="hidden sm:inline-flex mono-meta">· {team.inviteCode}</span>
        ) : null}
      </div>

      {/* 中：占位 */}
      <div className="flex-1" />

      {/* 右：邀请口令 + 昵称 + 操作 */}
      {team && member ? (
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShareTeam(true)}
            leadingIcon={<Share2 size={13} />}
          >
            <span className="hidden sm:inline">邀请同事</span>
            <span className="sm:hidden">邀请</span>
          </Button>
          {myTeams.length > 1 ? (
            <IconButton
              onClick={() => setTeamPicker(true)}
              aria-label="切换团队"
              title="切换团队"
            >
              <Shuffle size={16} />
            </IconButton>
          ) : null}
          <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-white/[0.08]">
            <Avatar char={displayChar} size="sm" />
            <span className="text-[13px] text-ink/85 font-medium">
              {displayName}
            </span>
          </div>
          <IconButton
            onClick={() => setHelpDrawer(true)}
            aria-label="使用说明"
            title="使用说明"
          >
            <HelpCircle size={18} />
          </IconButton>
          <IconButton
            onClick={() => setDMDrawer(true)}
            aria-label="私信"
            title="私信"
            className="relative"
          >
            <MessageSquare size={18} />
            {unread > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 inline-flex items-center justify-center bg-accent-gradient text-white text-[10px] font-mono font-semibold rounded-full shadow-glow">
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
          </IconButton>
          <IconButton
            onClick={handleRefresh}
            aria-label="刷新"
            title="刷新数据"
          >
            <RefreshCw size={16} />
          </IconButton>
          <IconButton
            onClick={() => setTeamDrawer(true)}
            aria-label="团队设置"
            title="团队设置"
          >
            <Settings size={18} />
          </IconButton>
          <IconButton
            onClick={() => {
              if (confirm("确定要登出当前账号吗？")) logout();
            }}
            aria-label="登出账号"
            title="登出账号"
          >
            <LogOut size={16} />
          </IconButton>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <IconButton
            onClick={() => setHelpDrawer(true)}
            aria-label="使用说明"
            title="使用说明"
          >
            <HelpCircle size={18} />
          </IconButton>
          {user ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setOnboarding(true)}
            >
              创建 / 加入团队
            </Button>
          ) : null}
        </div>
      )}
    </header>
  );
}
