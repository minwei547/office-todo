# 办公室共享待办清单

一张共享清单，让全队知道「谁在做什么、什么还没做」。支持任务看板、活动记录、私信、实时同步。

## 技术栈

- **前端**：React 18 + Vite + TypeScript + Zustand + Tailwind
- **后端**：Node.js + Express + WebSocket（ws）+ PostgreSQL（pg）
- **实时**：WebSocket 团队订阅 + REST 路由后广播
- **认证**：HTTP header `x-member-id`（无密码，按设备身份）

## 本地开发

```bash
# 1. 安装依赖（根 + server）
npm install
npm --prefix server install

# 2. 起本地 Postgres（任选其一）
#    a) Docker：
docker run --name todo-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=office_todo -p 5432:5432 -d postgres:16
#    b) 或用云端 Postgres（如 Render / Supabase 免费层）

# 3. 配置环境变量
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/office_todo"
# 云端 PG 需要开启 SSL
# export DATABASE_SSL=true

# 4. 同时启动前端（5173）+ 后端（3001），vite 会把 /api /ws 代理到 3001
npm run dev          # 终端 1：前端
npm run dev:server   # 终端 2：后端
```

打开 http://localhost:5173/

## 部署到 Render（推荐）

### 前置准备

1. 把本项目推到 GitHub 仓库
2. 注册 Render 账号（https://render.com，可用 GitHub 登录）

### 一键部署（Blueprint）

1. 登录 Render → Dashboard
2. 右上角 **New +** → **Blueprint**
3. 选择你刚推送的 GitHub 仓库
4. Render 会自动读取根目录的 `render.yaml`，识别出：
   - 一个 Postgres 数据库 `office-todo-db`（免费层）
   - 一个 Web 服务 `office-todo`（免费层 Node 服务）
5. 点 **Apply** → 等待构建（约 2-5 分钟）
6. 部署完成后，Web 服务会有一个公网域名：`https://office-todo.onrender.com`
7. 任何人打开这个域名即可使用

### 手动部署（如果 Blueprint 不工作）

1. Render Dashboard → **New +** → **PostgreSQL** → 创建免费数据库，记下 `Internal Database URL`
2. Render Dashboard → **New +** → **Web Service** → 选你的 GitHub 仓库
   - **Runtime**：Node
   - **Build Command**：`npm install && npm run build:all`
   - **Start Command**：`npm start`
3. 环境变量：
   - `DATABASE_URL`：粘贴第 1 步的内部连接串
   - `DATABASE_SSL`：`true`
   - `NODE_ENV`：`production`
4. 创建服务，等部署完成

### 用法

1. **团队所有者**：打开公网域名 → 「创建新团队」→ 输入昵称 + 团队名 → 拿到 6 位邀请码
2. 点右上角「邀请同事」按钮 → 弹出二维码 + 邀请链接（带 `?invite=邀请码`）
3. **同事**：用手机扫码或点开邀请链接 → 自动填好邀请码 → 输入昵称 → 加入
4. 任何成员创建/修改任务、发私信 → 其他成员**实时同步**看到

## 项目结构

```
.
├── src/                       # 前端 React
│   ├── components/
│   ├── store/todoStore.ts     # Zustand store：调用 API + 合并 WS 推送
│   ├── lib/api.ts             # REST 客户端封装
│   └── lib/socket.ts          # WebSocket 客户端
├── server/                    # 后端 Node
│   ├── src/db.ts              # pg 连接池 + 建表
│   ├── src/routes.ts          # REST API 路由
│   ├── src/realtime.ts        # WebSocket 订阅管理
│   └── src/index.ts           # Express + HTTP + WS 入口
├── render.yaml                # Render Blueprint 配置
├── vite.config.ts             # dev proxy: /api /ws → 3001
└── package.json
```

## API 路由

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/teams` | 创建团队 |
| POST | `/api/teams/join` | 加入团队 |
| GET | `/api/teams/:teamId` | 取团队+成员 |
| PATCH | `/api/teams/:teamId` | 重命名团队（owner only） |
| PATCH | `/api/members/:memberId` | 改昵称 |
| GET | `/api/teams/:teamId/tasks` | 拉团队全部任务+活动+备注 |
| POST | `/api/tasks` | 创建任务 |
| PATCH | `/api/tasks/:taskId` | 更新任务 |
| POST | `/api/tasks/:taskId/status` | 切状态（联动进度） |
| POST | `/api/tasks/:taskId/progress` | 调进度（联动状态） |
| DELETE | `/api/tasks/:taskId` | 删除任务（级联） |
| POST | `/api/tasks/:taskId/notes` | 添加备注 |
| GET | `/api/messages` | 会话列表 |
| GET | `/api/messages/:peerId` | 与 peer 全部消息 |
| POST | `/api/messages` | 发送私信 |
| POST | `/api/messages/:peerId/read` | 标记已读 |
| GET | `/api/teams/:teamId/export` | 团队数据导出 |
| GET | `/health` | 健康检查 |
| WS | `/ws` | 实时推送（订阅 team:created/task:updated/message:sent 等） |

## 免费层限制

- **Render Web Service 免费层**：服务 15 分钟无请求会休眠，下一次请求会有 ~30 秒冷启动
- **Render Postgres 免费层**：90 天未使用会回收数据库（首次部署后请尽快使用）
- 如需 7×24 在线，可升级到付费层（约 $7/月）
