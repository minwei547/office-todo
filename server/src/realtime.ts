// 实时推送：管理团队订阅 + 广播
import { WebSocket } from "ws";

const teamSubs = new Map<string, Set<WebSocket>>();

export function subscribe(ws: WebSocket, teamId: string) {
  if (!teamSubs.has(teamId)) teamSubs.set(teamId, new Set());
  teamSubs.get(teamId)!.add(ws);
  (ws as any).__teamId = teamId;
}

export function unsubscribe(ws: WebSocket) {
  const teamId = (ws as any).__teamId;
  if (!teamId) return;
  teamSubs.get(teamId)?.delete(ws);
  if (teamSubs.get(teamId)?.size === 0) teamSubs.delete(teamId);
}

// 广播给同团队所有连接（可选排除发起方）
export function broadcastToTeam(
  teamId: string,
  message: unknown,
  excludeWs?: WebSocket,
) {
  const subs = teamSubs.get(teamId);
  if (!subs) return;
  const payload = JSON.stringify(message);
  for (const ws of subs) {
    if (ws === excludeWs) continue;
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  }
}
