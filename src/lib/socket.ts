// WebSocket 客户端：订阅团队频道，接收实时推送
// 连接 URL /ws 由 vite proxy 转发到后端

type ServerEvent =
  | { type: "subscribed"; teamId: string }
  | { type: "error"; error: string }
  | { type: "team:created"; teamId: string; team: any; member: any }
  | { type: "team:renamed"; teamId: string; team: any }
  | { type: "member:joined"; teamId: string; member: any }
  | { type: "member:updated"; teamId: string; member: any }
  | { type: "task:created"; teamId: string; task: any; activity: any }
  | { type: "task:updated"; teamId: string; task: any; activity: any }
  | { type: "task:deleted"; teamId: string; taskId: string }
  | { type: "note:added"; teamId: string; note: any; activity: any }
  | { type: "message:sent"; teamId: string; message: any }
  | { type: "message:read"; teamId: string; conversationId: string; readerId: string; peerId: string };

type Listener = (event: ServerEvent) => void;

class SocketClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private teamId: string | null = null;
  private memberId: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private explicitlyClosed = false;

  connect(teamId: string, memberId: string) {
    this.teamId = teamId;
    this.memberId = memberId;
    this.explicitlyClosed = false;
    this.open();
  }

  private open() {
    if (!this.teamId || !this.memberId) return;
    // 构建 ws URL：与当前页面同源
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${location.host}/ws`;
    try {
      this.ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.ws?.send(
        JSON.stringify({
          type: "subscribe",
          teamId: this.teamId,
          memberId: this.memberId,
        }),
      );
    };

    this.ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as ServerEvent;
        this.listeners.forEach((l) => l(event));
      } catch {
        /* ignore */
      }
    };

    this.ws.onclose = () => {
      if (!this.explicitlyClosed) this.scheduleReconnect();
    };
    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.open();
    }, 2000);
  }

  disconnect() {
    this.explicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.teamId = null;
    this.memberId = null;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const socket = new SocketClient();
export type { ServerEvent };
