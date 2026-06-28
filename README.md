# 办公室共享待办清单

一张共享清单，让全队知道「谁在做什么、什么还没做」。支持任务看板、活动记录、私信、实时同步。

## 技术栈

- **前端**：React 18 + Vite + TypeScript + Zustand + Tailwind
- **后端**：Supabase Edge Functions（Deno）+ PostgreSQL
- **实时**：轮询同步（2.5s 间隔），页面响应后自动刷新
- **认证**：HTTP header `x-member-id`（无密码，按设备身份）

## 部署步骤

### 第 1 步：创建 Supabase 项目

1. 打开 https://supabase.com/ → 用 GitHub 登录（免费）
2. **New Project** → 项目名填 `office-todo` → **Create new project**
3. 等 1-2 分钟创建完成

### 第 2 步：创建数据库表

1. Supabase 左侧 → **SQL Editor** → **New query**
2. 粘贴 `supabase/schema.sql` 的内容 → 点 **Run**
3. 确认 6 张表创建成功

### 第 3 步：部署 Edge Function

1. 安装 Supabase CLI（按官方文档）
2. 登录：`supabase login`
3. 链接项目：`supabase link --project-ref <你的项目id>`（项目 Settings → General → Reference ID）
4. 部署函数：`supabase functions deploy api`
5. 部署完成后，拿到函数 URL：`https://<项目id>.functions.supabase.co/api`

### 第 4 步：部署前端到 Vercel

1. 打开 https://vercel.com/ → 用 GitHub 登录（免费）
2. **New Project** → 选你的 GitHub 仓库 `minwei547/office-todo` → **Import**
3. 环境变量：
   - `VITE_API_BASE_URL`: 填第 3 步拿到的函数 URL（如 `https://xxxx.functions.supabase.co`）
4. 点 **Deploy** → 等 2-3 分钟 → 拿到前端 URL（如 `https://office-todo.vercel.app`）

### 第 5 步：开始用

1. 打开公网 URL → 弹「创建团队」→ 输入昵称+团队名 → 拿到邀请码
2. 点右上角「邀请同事」按钮 → 出二维码 + 邀请链接
3. 同事打开链接 → 输入邀请码 → 加入团队
4. 任何成员创建/修改任务、发私信 → 其他成员 2-3 秒内看到更新

## 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 配置 .env 文件（复制 .env.example）
# VITE_API_BASE_URL=https://xxx.functions.supabase.co

# 3. 启动前端（会自动代理到 Supabase Edge Functions）
npm run dev

# 打开 http://localhost:5173/
```

## 项目结构

```
.
├── src/                       # 前端 React
│   ├── components/
│   ├── store/todoStore.ts     # Zustand store：调用 API + 轮询同步
│   ├── lib/api.ts             # REST 客户端封装（支持 VITE_API_BASE_URL）
│   └── lib/socket.ts          # 轮询客户端（2.5s 间隔）
├── supabase/                  # Supabase 配置
│   ├── schema.sql             # 建表脚本
│   └── functions/api/index.ts # Edge Function API
├── .env.example               # 环境变量模板
└── vite.config.ts             # dev proxy
```

## API 路由

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/teams` | 创建团队 |
| POST | `/api/teams/join` | 加入团队 |
| GET | `/api/teams/:teamId` | 取团队+成员 |
| PATCH | `/api/teams/:teamId` | 重命名团队 |
| PATCH | `/api/members/:memberId` | 改昵称 |
| GET | `/api/teams/:teamId/tasks` | 拉团队全部任务+活动+备注 |
| POST | `/api/tasks` | 创建任务 |
| PATCH | `/api/tasks/:taskId` | 更新任务 |
| POST | `/api/tasks/:taskId/status` | 切状态（联动进度） |
| POST | `/api/tasks/:taskId/progress` | 调进度（联动状态） |
| DELETE | `/api/tasks/:taskId` | 删除任务 |
| POST | `/api/tasks/:taskId/notes` | 添加备注 |
| GET | `/api/messages` | 会话列表 |
| GET | `/api/messages/:peerId` | 与 peer 全部消息 |
| POST | `/api/messages` | 发送私信 |
| POST | `/api/messages/:peerId/read` | 标记已读 |
| GET | `/api/teams/:teamId/export` | 团队数据导出 |
| GET | `/api/health` | 健康检查 |

## 免费层限制

- **Supabase Free Tier**：每月 500MB 数据库 + 1GB 带宽 + 3000 秒函数执行时间
- **Vercel Free Tier**：每月 100GB 带宽 + 自动 SSL
- 如需更大容量，可升级到付费层

## 关键设计

- **进度/状态联动**：progress=100→done；done→100%；todo→0%；in_progress 但 progress=0→10%
- **会话 ID**：`[a,b].sort().join(":")` 保证双向一致
- **邀请码**：6 位字母数字（去除易混淆字符 O/I/0/1）
- **轮询同步**：2.5 秒间隔，收到 `sync` 事件后调用 `refreshTeam` 拉取全量数据
