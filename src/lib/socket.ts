type ServerEvent =
  | { type: "sync" }
  | { type: "error"; error: string };

type Listener = (event: ServerEvent) => void;

class PollClient {
  private listeners = new Set<Listener>();
  private teamId: string | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;

  connect(teamId: string) {
    this.teamId = teamId;
    this.startPolling();
  }

  private startPolling() {
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => {
      if (this.teamId) {
        this.listeners.forEach((l) =>
          l({ type: "sync" }),
        );
      }
    }, 5000);
    this.listeners.forEach((l) => l({ type: "sync" }));
  }

  disconnect() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.teamId = null;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const socket = new PollClient();
export type { ServerEvent };
