import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Activity,
  DirectMessage,
  Member,
  Note,
  Priority,
  Task,
  TaskStatus,
  Team,
} from "@/types";
import { api, getMemberId, setMemberId } from "@/lib/api";
import { socket } from "@/lib/socket";

// 仅持久化"本机身份记忆"，团队/任务等数据由后端实时拉取
interface SessionState {
  memberId: string | null;
  teamId: string | null;
  nickname: string;
}

interface TodoState {
  // 镜像：从后端拉取的全量数据
  currentMemberId: string | null;
  currentTeamId: string | null;
  team: Team | null;
  members: Record<string, Member>;
  tasks: Record<string, Task>;
  activities: Record<string, Activity>;
  notes: Record<string, Note>;
  messages: Record<string, DirectMessage>;
  loading: boolean;
  error: string | null;

  // 初始化
  initFromSession: () => Promise<void>;
  refreshTeam: (teamId: string) => Promise<void>;
  setLoading: (b: boolean) => void;
  setError: (e: string | null) => void;

  // 团队 / 成员
  createTeam: (
    teamName: string,
    nickname: string,
  ) => Promise<{ teamId: string; memberId: string; inviteCode: string }>;
  joinTeam: (
    inviteCode: string,
    nickname: string,
  ) => Promise<{ teamId: string; memberId: string }>;
  switchTeam: (teamId: string) => Promise<void>;
  renameTeam: (teamId: string, name: string) => Promise<void>;
  updateNickname: (nickname: string) => Promise<void>;

  // 任务
  addTask: (input: {
    title: string;
    description?: string;
    assigneeId?: string | null;
    priority?: Priority;
    dueDate?: string | null;
    tags?: string[];
  }) => Promise<void>;
  updateTask: (taskId: string, patch: Partial<Task>) => Promise<void>;
  setTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  setTaskProgress: (taskId: string, progress: number) => Promise<void>;
  assignTask: (taskId: string, memberId: string | null) => Promise<void>;
  archiveTask: (taskId: string) => Promise<void>;
  restoreTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;

  // 备注
  addNote: (taskId: string, content: string) => Promise<void>;

  // 私信
  refreshConversations: () => Promise<void>;
  refreshConversation: (peerId: string) => Promise<void>;
  sendDM: (receiverId: string, content: string) => Promise<void>;
  markConversationRead: (peerId: string) => Promise<void>;

  // WS 推送合并
  applyServerEvent: (event: any) => void;

  // 导出
  exportJSON: () => Promise<string>;

  // 登出
  signOut: () => void;
}

// 持久化本机会话（仅 memberId / teamId / nickname）
const sessionPersist = persist<SessionState>(
  (set) => ({
    memberId: null,
    teamId: null,
    nickname: "",
  }),
  {
    name: "office-todo-session",
    storage: createJSONStorage(() => localStorage),
  },
);
const useSessionStore = create(sessionPersist);

export const useTodoStore = create<TodoState>((set, get) => ({
  currentMemberId: null,
  currentTeamId: null,
  team: null,
  members: {},
  tasks: {},
  activities: {},
  notes: {},
  messages: {},
  loading: false,
  error: null,

  initFromSession: async () => {
    const session = useSessionStore.getState();
    if (!session.memberId) {
      set({ loading: false });
      return;
    }
    setMemberId(session.memberId);
    set({ currentMemberId: session.memberId });
    if (session.teamId) {
      try {
        await get().refreshTeam(session.teamId);
        socket.connect(session.teamId);
      } catch {
        useSessionStore.setState({ memberId: null, teamId: null });
        setMemberId(null);
        set({ currentMemberId: null, currentTeamId: null, team: null });
      }
    }
  },

  refreshTeam: async (teamId) => {
    set({ loading: true, error: null });
    try {
      const { team, members } = await api.getTeam(teamId);
      const { tasks, activities, notes } = await api.getTeamTasks(teamId);
      const membersMap: Record<string, Member> = {};
      for (const m of members) membersMap[m.memberId] = m;
      const tasksMap: Record<string, Task> = {};
      for (const t of tasks) tasksMap[t.taskId] = t;
      const activitiesMap: Record<string, Activity> = {};
      for (const a of activities) activitiesMap[a.activityId] = a;
      const notesMap: Record<string, Note> = {};
      for (const n of notes) notesMap[n.noteId] = n;
      set({
        team,
        members: membersMap,
        tasks: tasksMap,
        activities: activitiesMap,
        notes: notesMap,
        currentTeamId: teamId,
        loading: false,
      });
    } catch (e: any) {
      set({ loading: false, error: e.message ?? "加载失败" });
      throw e;
    }
  },

  setLoading: (b) => set({ loading: b }),
  setError: (e) => set({ error: e }),

  createTeam: async (teamName, nickname) => {
    const result = await api.createTeam(teamName, nickname);
    setMemberId(result.memberId);
    useSessionStore.setState({
      memberId: result.memberId,
      teamId: result.teamId,
      nickname,
    });
    set({ currentMemberId: result.memberId, currentTeamId: result.teamId });
    await get().refreshTeam(result.teamId);
    socket.connect(result.teamId);
    return result;
  },

  joinTeam: async (inviteCode, nickname) => {
    const result = await api.joinTeam(inviteCode, nickname);
    setMemberId(result.memberId);
    useSessionStore.setState({
      memberId: result.memberId,
      teamId: result.teamId,
      nickname,
    });
    set({ currentMemberId: result.memberId, currentTeamId: result.teamId });
    await get().refreshTeam(result.teamId);
    socket.connect(result.teamId);
    return result;
  },

  switchTeam: async (teamId) => {
    socket.disconnect();
    useSessionStore.setState({ teamId });
    set({ currentTeamId: teamId });
    await get().refreshTeam(teamId);
    socket.connect(teamId);
  },

  renameTeam: async (teamId, name) => {
    await api.renameTeam(teamId, name);
    // WS 推送会更新本地
  },

  updateNickname: async (nickname) => {
    const cur = get().currentMemberId;
    if (!cur) return;
    await api.updateNickname(cur, nickname);
    useSessionStore.setState({ nickname });
    // WS 推送会更新本地 members
  },

  // 任务
  addTask: async (input) => {
    await api.createTask(input);
    // WS 推送会更新本地
  },

  updateTask: async (taskId, patch) => {
    await api.updateTask(taskId, patch);
  },

  setTaskStatus: async (taskId, status) => {
    await api.setTaskStatus(taskId, status);
  },

  setTaskProgress: async (taskId, progress) => {
    await api.setTaskProgress(taskId, progress);
  },

  assignTask: async (taskId, memberId) => {
    await api.updateTask(taskId, { assigneeId: memberId });
  },

  archiveTask: async (taskId) => {
    await api.updateTask(taskId, { archived: true });
  },

  restoreTask: async (taskId) => {
    await api.updateTask(taskId, { archived: false });
  },

  deleteTask: async (taskId) => {
    await api.deleteTask(taskId);
  },

  // 备注
  addNote: async (taskId, content) => {
    await api.addNote(taskId, content);
  },

  // 私信
  refreshConversations: async () => {
    const { conversations } = await api.getConversations();
    // 用 conversations 的 lastMessage 拼出已知消息（足够列表显示）
    // 完整对话通过 refreshConversation 拉取
    const messagesMap: Record<string, DirectMessage> = {};
    for (const c of conversations) {
      messagesMap[c.lastMessage.messageId] = c.lastMessage;
    }
    set((s) => ({ messages: { ...s.messages, ...messagesMap } }));
  },

  refreshConversation: async (peerId) => {
    const { messages } = await api.getConversation(peerId);
    const map: Record<string, DirectMessage> = {};
    for (const m of messages) map[m.messageId] = m;
    set((s) => ({ messages: { ...s.messages, ...map } }));
  },

  sendDM: async (receiverId, content) => {
    await api.sendMessage(receiverId, content);
  },

  markConversationRead: async (peerId) => {
    await api.markRead(peerId);
    // 本地立即把该会话消息标记已读，提升响应
    const me = get().currentMemberId;
    if (!me) return;
    set((s) => {
      const messages = { ...s.messages };
      for (const [id, m] of Object.entries(messages)) {
        if (
          m.receiverId === me &&
          m.senderId === peerId &&
          !m.read
        ) {
          messages[id] = { ...m, read: true };
        }
      }
      return { messages };
    });
  },

  // 轮询同步 + 推送合并
  applyServerEvent: (event) => {
    switch (event.type) {
      case "sync":
        {
          const teamId = get().currentTeamId;
          if (teamId) get().refreshTeam(teamId);
        }
        break;
      case "team:renamed":
        set((s) => (s.team?.teamId === event.teamId ? { team: event.team } : {}));
        break;
      case "member:joined":
        set((s) => ({
          members: { ...s.members, [event.member.memberId]: event.member },
        }));
        break;
      case "member:updated":
        set((s) => ({
          members: { ...s.members, [event.member.memberId]: event.member },
        }));
        break;
      case "task:created":
        set((s) => ({
          tasks: { ...s.tasks, [event.task.taskId]: event.task },
          activities: event.activity
            ? { ...s.activities, [event.activity.activityId]: event.activity }
            : s.activities,
        }));
        break;
      case "task:updated":
        set((s) => ({
          tasks: { ...s.tasks, [event.task.taskId]: event.task },
          activities: event.activity
            ? { ...s.activities, [event.activity.activityId]: event.activity }
            : s.activities,
        }));
        break;
      case "task:deleted":
        set((s) => {
          const tasks = { ...s.tasks };
          delete tasks[event.taskId];
          const notes = { ...s.notes };
          const activities = { ...s.activities };
          for (const [id, n] of Object.entries(notes)) {
            if (n.taskId === event.taskId) delete notes[id];
          }
          for (const [id, a] of Object.entries(activities)) {
            if (a.taskId === event.taskId) delete activities[id];
          }
          return { tasks, notes, activities };
        });
        break;
      case "note:added":
        set((s) => ({
          notes: { ...s.notes, [event.note.noteId]: event.note },
          activities: event.activity
            ? { ...s.activities, [event.activity.activityId]: event.activity }
            : s.activities,
        }));
        break;
      case "message:sent":
        set((s) => ({
          messages: { ...s.messages, [event.message.messageId]: event.message },
        }));
        break;
      case "message:read": {
        // readerId 把与 peerId 的会话标记已读
        const me = get().currentMemberId;
        if (me !== event.readerId) return;
        set((s) => {
          const messages = { ...s.messages };
          for (const [id, m] of Object.entries(messages)) {
            if (
              m.conversationId === event.conversationId &&
              m.receiverId === me
            ) {
              messages[id] = { ...m, read: true };
            }
          }
          return { messages };
        });
        break;
      }
      default:
        break;
    }
  },

  exportJSON: async () => {
    const teamId = get().currentTeamId;
    if (!teamId) return "{}";
    const data = await api.exportTeam(teamId);
    return JSON.stringify(data, null, 2);
  },

  signOut: () => {
    socket.disconnect();
    useSessionStore.setState({ memberId: null, teamId: null, nickname: "" });
    setMemberId(null);
    set({
      currentMemberId: null,
      currentTeamId: null,
      team: null,
      members: {},
      tasks: {},
      activities: {},
      notes: {},
      messages: {},
    });
  },
}));

// 派生选择器：当前团队
export function selectCurrentTeam(state: TodoState): Team | null {
  return state.team;
}

export function selectCurrentMember(state: TodoState): Member | null {
  return state.currentMemberId ? state.members[state.currentMemberId] : null;
}

// 当前成员在当前团队下收到的未读私信总数
export function selectUnreadCount(state: TodoState): number {
  const me = state.currentMemberId;
  if (!me) return 0;
  return Object.values(state.messages).filter(
    (m) => m.receiverId === me && !m.read,
  ).length;
}
