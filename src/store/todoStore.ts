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
  User,
} from "@/types";
import {
  api,
  getMemberId,
  setMemberId,
  setUserId,
} from "@/lib/api";
import { socket } from "@/lib/socket";

// 仅持久化"本机身份记忆"（userId + 上次团队），团队/任务等数据由后端实时拉取
interface SessionState {
  userId: string | null;
  lastTeamId: string | null;
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

  // 认证
  user: User | null;
  myTeams: Array<Team & { myMemberId: string; myNickname: string }>;
  authLoading: boolean;

  // 初始化
  initFromSession: () => Promise<void>;
  refreshTeam: (teamId: string) => Promise<void>;
  setLoading: (b: boolean) => void;
  setError: (e: string | null) => void;

  // 认证
  register: (username: string, password: string, nickname: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loadMyTeams: () => Promise<void>;
  enterTeam: (teamId: string, memberId: string) => Promise<void>;

  // 团队 / 成员
  createTeam: (teamName: string, nickname: string) => Promise<void>;
  joinTeam: (inviteCode: string, nickname: string) => Promise<void>;
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
}

// 持久化本机会话（仅 userId / lastTeamId）
const sessionPersist = persist<SessionState>(
  (set) => ({
    userId: null,
    lastTeamId: null,
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

  user: null,
  myTeams: [],
  authLoading: false,

  initFromSession: async () => {
    const session = useSessionStore.getState();
    if (!session.userId) {
      set({ loading: false });
      return;
    }
    setUserId(session.userId);
    try {
      // 获取用户加入的团队
      const { teams } = await api.getMyTeams(session.userId);
      if (teams.length === 0) {
        // 已登录但没有团队
        set({ user: { userId: session.userId, username: "", nickname: "" }, loading: false });
        return;
      }
      set({ myTeams: teams, user: { userId: session.userId, username: "", nickname: "" } });
      // 进入上次团队
      const lastTeamId = session.lastTeamId;
      const team = lastTeamId ? teams.find((t) => t.teamId === lastTeamId) : teams[0];
      if (team) {
        setMemberId(team.myMemberId);
        set({ currentMemberId: team.myMemberId });
        await get().refreshTeam(team.teamId);
        socket.connect(team.teamId);
        try {
          await get().refreshConversations();
        } catch {
          // 私信加载失败不影响主流程
        }
      }
    } catch {
      useSessionStore.setState({ userId: null, lastTeamId: null });
      setUserId(null);
    }
    set({ loading: false });
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

  // 认证
  register: async (username, password, nickname) => {
    const result = await api.register(username, password, nickname);
    setUserId(result.userId);
    useSessionStore.setState({ userId: result.userId, lastTeamId: null });
    set({ user: result, myTeams: [] });
  },

  login: async (username, password) => {
    const result = await api.login(username, password);
    setUserId(result.userId);
    useSessionStore.setState({ userId: result.userId });
    set({ user: result });
    await get().loadMyTeams();
  },

  logout: () => {
    socket.disconnect();
    useSessionStore.setState({ userId: null, lastTeamId: null });
    setUserId(null);
    setMemberId(null);
    set({
      user: null,
      myTeams: [],
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

  loadMyTeams: async () => {
    const me = get().user;
    if (!me) return;
    const { teams } = await api.getMyTeams(me.userId);
    set({ myTeams: teams });
  },

  enterTeam: async (teamId, memberId) => {
    socket.disconnect();
    setMemberId(memberId);
    useSessionStore.setState({ lastTeamId: teamId });
    set({ currentMemberId: memberId, currentTeamId: teamId });
    await get().refreshTeam(teamId);
    socket.connect(teamId);
    try {
      await get().refreshConversations();
    } catch {
      // 私信加载失败不影响主流程
    }
  },

  createTeam: async (teamName, nickname) => {
    const me = get().user;
    if (!me) throw new Error("请先登录");
    const result = await api.createTeam(teamName, nickname, me.userId);
    setMemberId(result.memberId);
    useSessionStore.setState({ lastTeamId: result.teamId });
    set({ currentMemberId: result.memberId, currentTeamId: result.teamId });
    await get().refreshTeam(result.teamId);
    socket.connect(result.teamId);
    await get().loadMyTeams();
  },

  joinTeam: async (inviteCode, nickname) => {
    const me = get().user;
    if (!me) throw new Error("请先登录");
    const result = await api.joinTeam(inviteCode, nickname, me.userId);
    setMemberId(result.memberId);
    useSessionStore.setState({ lastTeamId: result.teamId });
    set({ currentMemberId: result.memberId, currentTeamId: result.teamId });
    await get().refreshTeam(result.teamId);
    socket.connect(result.teamId);
    await get().loadMyTeams();
  },

  renameTeam: async (teamId, name) => {
    set((s) => ({ team: s.team?.teamId === teamId ? { ...s.team, teamName: name } : s.team }));
    await api.renameTeam(teamId, name);
  },

  updateNickname: async (nickname) => {
    const cur = get().currentMemberId;
    if (!cur) return;
    set((s) => ({
      members: {
        ...s.members,
        [cur]: { ...s.members[cur], nickname },
      },
    }));
    await api.updateNickname(cur, nickname);
  },

  // 任务
  addTask: async (input) => {
    const { task, activity } = await api.createTask(input);
    set((s) => ({
      tasks: { ...s.tasks, [task.taskId]: task },
      activities: { ...s.activities, [activity.activityId]: activity },
    }));
  },

  updateTask: async (taskId, patch) => {
    set((s) => ({
      tasks: { ...s.tasks, [taskId]: { ...s.tasks[taskId], ...patch } },
    }));
    const { activity } = await api.updateTask(taskId, patch);
    if (activity) {
      set((s) => ({
        activities: { ...s.activities, [activity.activityId]: activity },
      }));
    }
  },

  setTaskStatus: async (taskId, status) => {
    let newProgress = get().tasks[taskId]?.progress || 0;
    if (status === "done") newProgress = 100;
    else if (status === "todo") newProgress = 0;
    else if (status === "in_progress" && newProgress === 0) newProgress = 10;
    set((s) => ({
      tasks: {
        ...s.tasks,
        [taskId]: { ...s.tasks[taskId], status, progress: newProgress },
      },
    }));
    const { activity } = await api.setTaskStatus(taskId, status);
    if (activity) {
      set((s) => ({
        activities: { ...s.activities, [activity.activityId]: activity },
      }));
    }
  },

  setTaskProgress: async (taskId, progress) => {
    const current = get().tasks[taskId];
    if (!current) return;
    const clamped = Math.max(0, Math.min(100, Math.round(progress)));
    let newStatus = current.status;
    if (clamped >= 100 && newStatus !== "done") newStatus = "done";
    else if (clamped > 0 && clamped < 100 && newStatus === "todo") newStatus = "in_progress";
    else if (clamped < 100 && newStatus === "done") newStatus = "in_progress";
    set((s) => ({
      tasks: {
        ...s.tasks,
        [taskId]: { ...s.tasks[taskId], progress: clamped, status: newStatus },
      },
    }));
    const { activity } = await api.setTaskProgress(taskId, clamped);
    if (activity) {
      set((s) => ({
        activities: { ...s.activities, [activity.activityId]: activity },
      }));
    }
  },

  assignTask: async (taskId, memberId) => {
    set((s) => ({
      tasks: { ...s.tasks, [taskId]: { ...s.tasks[taskId], assigneeId: memberId } },
    }));
    await api.updateTask(taskId, { assigneeId: memberId });
  },

  archiveTask: async (taskId) => {
    set((s) => ({
      tasks: { ...s.tasks, [taskId]: { ...s.tasks[taskId], archived: true } },
    }));
    await api.updateTask(taskId, { archived: true });
  },

  restoreTask: async (taskId) => {
    set((s) => ({
      tasks: { ...s.tasks, [taskId]: { ...s.tasks[taskId], archived: false } },
    }));
    await api.updateTask(taskId, { archived: false });
  },

  deleteTask: async (taskId) => {
    set((s) => {
      const tasks = { ...s.tasks };
      delete tasks[taskId];
      return { tasks };
    });
    await api.deleteTask(taskId);
  },

  // 备注
  addNote: async (taskId, content) => {
    const { note, activity } = await api.addNote(taskId, content);
    set((s) => ({
      notes: { ...s.notes, [note.noteId]: note },
      activities: { ...s.activities, [activity.activityId]: activity },
    }));
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
    const me = get().currentMemberId;
    if (!me) return;
    const { message } = await api.sendMessage(receiverId, content);
    set((s) => ({ messages: { ...s.messages, [message.messageId]: message } }));
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
          if (teamId) {
            get().refreshTeam(teamId);
            // 同步私信
            get().refreshConversations().catch(() => {});
          }
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
