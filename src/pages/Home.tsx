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
      <div className="h-screen grid place-items-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-300/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="mono-meta">正在连接团队…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-50">
      <TeamBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <TaskArea />
        </main>
      </div>

      {error ? (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lift text-[12px]">
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
