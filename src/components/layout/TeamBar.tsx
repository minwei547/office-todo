import {
  Bell,
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
  const setNotifyDrawer = useUIStore((s) => s.setNotifyDrawer);
  const setOnboarding = useUIStore((s) => s.setOnboarding);
  const setDMDrawer = useUIStore((s) => s.setDMDrawer);
  const setHelpDrawer = useUIStore((s) => s.setHelpDrawer);
  const setShareTeam = useUIStore((s) => s.setShareTeam);
  const setTeamPicker = useUIStore((s) => s.setTeamPicker);

  function handleRefresh() {
    if (currentTeamId) refreshTeam(currentTeamId);
  }

  const displayName = user?.nickname || member?.nickname || "";
  const displayChar = member?.avatarChar || displayName.slice(0, 1) || "?";

  return (
    <header className="relative flex items-center gap-3 px-5 h-16 bg-surface/70 border-b border-line backdrop-blur-xl">
      {/* 左：Logo + 团队名 */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative h-8 w-8 shrink-0">
          <div className="relative h-8 w-8 grid place-items-center bg-mint-gradient text-[#2a5a4a] rounded-xl shadow-sm">
            <span className="font-sans font-bold text-[14px] leading-none">辑</span>
          </div>
        </div>
        <h1 className="biz-title text-[17px] text-ink truncate max-w-[260px]">
          {team?.teamName ?? "未加入团队"}
        </h1>
        {team ? (
          <span className="hidden sm:inline-flex mono-meta">· {team.inviteCode}</span>
        ) : null}
      </div>

      <div className="flex-1" />

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
          <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-line">
            <Avatar char={displayChar} size="sm" />
            <span className="text-[13px] text-ink font-medium">
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
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 inline-flex items-center justify-center bg-peach text-[#5a3a2a] text-[10px] font-mono font-semibold rounded-full shadow-sm">
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
            onClick={() => setNotifyDrawer(true)}
            aria-label="通知设置"
            title="通知设置"
          >
            <Bell size={18} />
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
