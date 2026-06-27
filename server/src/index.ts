// 服务器入口：Express REST API + WebSocket 实时推送 + 静态文件托管
import express from "express";
import cors from "cors";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import { router } from "./routes.js";
import { pool, initSchema } from "./db.js";
import { subscribe, unsubscribe } from "./realtime.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// REST API
app.use("/api", router);

// 健康检查
app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// 静态文件托管前端构建产物（生产部署用）
const clientDist = path.resolve(__dirname, "../../dist");
app.use(express.static(clientDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) res.status(404).end();
  });
});

const server = http.createServer(app);

// ── WebSocket：实时推送 ──
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws) => {
  ws.on("message", async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "subscribe" && msg.teamId) {
        // 校验：必须有该团队的有效成员
        const memberId = msg.memberId;
        if (!memberId) return;
        const { rows } = await pool.query(
          "SELECT * FROM members WHERE memberId = $1 AND teamId = $2",
          [memberId, msg.teamId],
        );
        const member = rows[0];
        if (!member) {
          ws.send(JSON.stringify({ type: "error", error: "订阅失败：身份无效" }));
          return;
        }
        subscribe(ws, msg.teamId);
        ws.send(JSON.stringify({ type: "subscribed", teamId: msg.teamId }));
      }
    } catch {
      /* ignore */
    }
  });

  ws.on("close", () => unsubscribe(ws));
  ws.on("error", () => unsubscribe(ws));
});

// 启动前先建表（CREATE TABLE IF NOT EXISTS），再监听端口
initSchema()
  .then(() => {
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`[server] listening on http://0.0.0.0:${PORT}`);
      console.log(`[server] REST API at /api, WebSocket at /ws`);
    });
  })
  .catch((err) => {
    console.error("[server] initSchema failed:", err);
    process.exit(1);
  });
