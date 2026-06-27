// BroadcastChannel 封装：同源同浏览器多窗口实时联动
// 用于在多个标签页之间同步任务变更

const CHANNEL_NAME = "office-todo-sync";

type SyncMessage =
  | { kind: "state"; payload: unknown }
  | { kind: "ping" };

type Listener = (msg: SyncMessage) => void;

class BroadcastBus {
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<Listener>();

  constructor() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (e: MessageEvent<SyncMessage>) => {
        this.listeners.forEach((l) => l(e.data));
      };
    }
  }

  post(msg: SyncMessage) {
    this.channel?.postMessage(msg);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const broadcastBus = new BroadcastBus();
