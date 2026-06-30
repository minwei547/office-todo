import { useEffect } from "react";
import { TeamBar } from "@/components/layout/TeamBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { TaskArea } from "@/components/layout/TaskArea";
import { OnboardingModal } from "@/components/team/OnboardingModal";
import { AuthModal } from "@/components/team/AuthModal";
import { TeamPicker } from "@/components/team/TeamPicker";
import { ShareTeamModal } from "@/components/team/ShareTeamModal";
import { TeamSettingDrawer } from "@/components/team/TeamSettingDrawer";
import { TaskDetailDrawer } from "@/components/task/TaskDetailDrawer";
import { DMDrawer } from "@/components/dm/DMDrawer";
import { HelpDrawer } from "@/components/help/HelpDrawer";
import { NotifyDrawer } from "@/components/notify/NotifyDrawer";
import { useTodoStore, selectCurrentTeam } from "@/store/todoStore";
import { useUIStore } from "@/store/uiStore";
import { socket } from "@/lib/socket";

export default function Home() {
  const team = useTodoStore(selectCurrentTeam);
  const user = useTodoStore((s) => s.user);
  const loading = useTodoStore((s) => s.loading);
  const authLoading = useTodoStore((s) => s.authLoading);
  const error = useTodoStore((s) => s.error);
  const initFromSession = useTodoStore((s) => s.initFromSession);
  const applyServerEvent = useTodoStore((s) => s.applyServerEvent);
  const setOnboarding = useUIStore((s) => s.setOnboarding);
  const setAuthModal = useUIStore((s) => s.setAuthModal);
  const setTeamPicker = useUIStore((s) => s.setTeamPicker);
  const setDMDrawer = useUIStore((s) => s.setDMDrawer);
  const shareTeamOpen = useUIStore((s) => s.shareTeamOpen);
  const setShareTeam = useUIStore((s) => s.setShareTeam);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      await initFromSession();
      unsub = socket.subscribe((event) => {
        applyServerEvent(event);
      });
    })();
    return () => {
      unsub?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 通知点击：聚焦窗口并打开对应抽屉
  useEffect(() => {
    const onOpenDM = () => setDMDrawer(true);
    const onOpenTasks = () => {
      // 任务区已在主视图，仅聚焦窗口即可
      window.focus();
    };
    window.addEventListener("app:open-dm", onOpenDM);
    window.addEventListener("app:open-tasks", onOpenTasks);
    return () => {
      window.removeEventListener("app:open-dm", onOpenDM);
      window.removeEventListener("app:open-tasks", onOpenTasks);
    };
  }, [setDMDrawer]);

  useEffect(() => {
    if (!user) {
      setAuthModal(true);
      setOnboarding(false);
      setTeamPicker(false);
    } else if (authLoading) {
      // 登录/注册/拉取团队期间，不弹任何团队选择窗口，避免重复创建身份
      setAuthModal(false);
      setTeamPicker(false);
      setOnboarding(false);
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
  }, [user, team, authLoading, setAuthModal, setOnboarding, setTeamPicker]);

  if ((loading && !team) || (authLoading && user && !team)) {
    return (
      <div className="h-screen grid place-items-center">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full bg-mint-gradient blur-md animate-pulse" />
            <div className="absolute inset-0 rounded-full border-2 border-line border-t-mint animate-spin" />
          </div>
          <p className="mono-meta">{authLoading ? "正在登录…" : "正在连接团队…"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full min-h-screen">
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
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-peach-soft text-[#a85c4a] border border-peach rounded-full shadow-md text-[12px] font-medium">
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
      <NotifyDrawer />
      <ShareTeamModal
        open={shareTeamOpen}
        onClose={() => setShareTeam(false)}
      />
    </div>
  );
}
