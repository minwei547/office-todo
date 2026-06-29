import { useEffect } from "react";
import { TeamBar } from "@/components/layout/TeamBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { TaskArea } from "@/components/layout/TaskArea";
import { OnboardingModal } from "@/components/team/OnboardingModal";
import { AuthModal } from "@/components/team/AuthModal";
import { TeamPicker } from "@/components/team/TeamPicker";
import { TeamSettingDrawer } from "@/components/team/TeamSettingDrawer";
import { ShareTeamModal } from "@/components/team/ShareTeamModal";
import { TaskDetailDrawer } from "@/components/task/TaskDetailDrawer";
import { DMDrawer } from "@/components/dm/DMDrawer";
import { HelpDrawer } from "@/components/help/HelpDrawer";
import { useTodoStore, selectCurrentTeam } from "@/store/todoStore";
import { useUIStore } from "@/store/uiStore";
import { socket } from "@/lib/socket";

export default function Home() {
  const team = useTodoStore(selectCurrentTeam);
  const user = useTodoStore((s) => s.user);
  const loading = useTodoStore((s) => s.loading);
  const error = useTodoStore((s) => s.error);
  const initFromSession = useTodoStore((s) => s.initFromSession);
  const applyServerEvent = useTodoStore((s) => s.applyServerEvent);
  const setOnboarding = useUIStore((s) => s.setOnboarding);
  const setAuthModal = useUIStore((s) => s.setAuthModal);
  const setTeamPicker = useUIStore((s) => s.setTeamPicker);
  const shareTeamOpen = useUIStore((s) => s.shareTeamOpen);
  const setShareTeam = useUIStore((s) => s.setShareTeam);

  // 启动时从会话恢复身份 + 连接 WS
  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      await initFromSession();
      // 注册 WS 事件监听
      unsub = socket.subscribe((event) => {
        applyServerEvent(event);
      });
    })();
    return () => {
      unsub?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 用户 / 团队状态变化时控制弹窗
  useEffect(() => {
    if (!user) {
      setAuthModal(true);
      setOnboarding(false);
      setTeamPicker(false);
    } else {
      setAuthModal(false);
      if (!team) {
        setTeamPicker(true);
        setOnboarding(false);
      } else {
        setTeamPicker(false);
        setOnboarding(false);
      }
    }
  }, [user, team, setAuthModal, setOnboarding, setTeamPicker]);

  if (loading && !team) {
    return (
      <div className="h-screen grid place-items-center grid-bg">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full bg-accent-gradient blur-md animate-glow-pulse" />
            <div className="absolute inset-0 rounded-full border-2 border-white/10 border-t-accent animate-spin" />
          </div>
          <p className="mono-meta">正在连接团队…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full min-h-screen">
      {/* 网格底纹层 */}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
      {/* 顶部渐变光带 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-accent-gradient opacity-60" />

      <div className="relative z-10 flex flex-col h-full">
        <TeamBar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 flex flex-col overflow-hidden">
            <TaskArea />
          </main>
        </div>
      </div>

      {error ? (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-accent-gradient text-white rounded-lg shadow-glow text-[12px]">
          {error}
        </div>
      ) : null}

      {/* 全局抽屉 / 弹窗 */}
      <AuthModal />
      <TeamPicker />
      <OnboardingModal />
      <TeamSettingDrawer />
      <TaskDetailDrawer />
      <DMDrawer />
      <HelpDrawer />
      <ShareTeamModal
        open={shareTeamOpen}
        onClose={() => setShareTeam(false)}
      />
    </div>
  );
}
