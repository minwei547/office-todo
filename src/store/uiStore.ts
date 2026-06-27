import { create } from "zustand";
import type { SortKey, TaskFilter, ViewMode } from "@/types";
import { DEFAULT_FILTER } from "@/features/filters";

interface UIState {
  // 视图与排序
  view: ViewMode;
  setView: (v: ViewMode) => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;

  // 筛选
  filter: TaskFilter;
  patchFilter: (patch: Partial<TaskFilter>) => void;
  resetFilter: () => void;

  // 归档显隐
  showArchived: boolean;
  toggleShowArchived: () => void;

  // 任务详情抽屉
  selectedTaskId: string | null;
  openTask: (taskId: string) => void;
  closeTask: () => void;

  // 团队设置抽屉
  teamDrawerOpen: boolean;
  setTeamDrawer: (open: boolean) => void;

  // 私信抽屉
  dmDrawerOpen: boolean;
  setDMDrawer: (open: boolean) => void;
  dmPeerId: string | null;
  setDMPeer: (peerId: string | null) => void;

  // 使用说明抽屉
  helpDrawerOpen: boolean;
  setHelpDrawer: (open: boolean) => void;

  // 入职弹窗（昵称 + 团队）
  onboardingOpen: boolean;
  setOnboarding: (open: boolean) => void;

  // 分享团队弹窗（邀请码 + 二维码）
  shareTeamOpen: boolean;
  setShareTeam: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  view: "list",
  setView: (v) => set({ view: v }),
  sort: "dueDate",
  setSort: (s) => set({ sort: s }),
  filter: { ...DEFAULT_FILTER },
  patchFilter: (patch) =>
    set((s) => ({ filter: { ...s.filter, ...patch } })),
  resetFilter: () => set({ filter: { ...DEFAULT_FILTER } }),
  showArchived: false,
  toggleShowArchived: () =>
    set((s) => ({ showArchived: !s.showArchived })),
  selectedTaskId: null,
  openTask: (taskId) => set({ selectedTaskId: taskId }),
  closeTask: () => set({ selectedTaskId: null }),
  teamDrawerOpen: false,
  setTeamDrawer: (open) => set({ teamDrawerOpen: open }),
  dmDrawerOpen: false,
  setDMDrawer: (open) => set({ dmDrawerOpen: open }),
  dmPeerId: null,
  setDMPeer: (peerId) => set({ dmPeerId: peerId }),
  helpDrawerOpen: false,
  setHelpDrawer: (open) => set({ helpDrawerOpen: open }),
  onboardingOpen: false,
  setOnboarding: (open) => set({ onboardingOpen: open }),
  shareTeamOpen: false,
  setShareTeam: (open) => set({ shareTeamOpen: open }),
}));
