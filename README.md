# 办公室共享待办清单

一张共享清单，让全队知道「谁在做什么、什么还没做」。支持任务看板、活动记录、私信、实时同步、账号密码登录、跨设备访问。

## 技术栈

- **前端**：React 18 + Vite + TypeScript + Zustand + Tailwind + @supabase/supabase-js
- **后端**：Supabase PostgreSQL（无服务器，无 Edge Function）
- **实时**：轮询同步（5s 间隔）
- **认证**：账号密码系统（SHA-256 + 盐值），支持跨设备登录、一人多团队

## 部署步骤

### 第 1 步：创建 Supabase 项目

1. 打开 https://supabase.com/ → 用 GitHub 登录
2. **New Project**：
   - Project Name：`office-todo`
   - Database Password：自己设一个（记好）
   - Region：选最近的（如 Northeast Asia - Tokyo）
3. 等 1-2 分钟，状态变成 **Ready**

### 第 2 步：执行建表 SQL

1. Supabase 左侧菜单 → **SQL Editor** → **New query**
2. 把 [supabase/schema.sql](supabase/schema.sql) 的**全部内容**复制粘贴进去
3. 点 **Run**
4. 底部出现 `✅ 建表完成！共创建 7 张表 + 10 个索引 + 7 条 RLS 策略` 即成功

> ⚠️ **关键**：脚本里所有驼峰列名（`userId`、`createdAt` 等）必须用双引号包裹，否则 PostgreSQL 会自动转成小写，导致 PostgREST 暴露的列名与前端代码不匹配。

### 第 3 步：拿到 API 密钥

1. Supabase 左侧 → **Settings**（齿轮图标）→ **API**
2. 记下：
   - **Project URL**：`https://xxxxx.supabase.co`
   - **anon public key**：`eyJhbGci...`（一长串）

### 第 4 步：部署前端到 Cloudflare Pages

1. 把本仓库推到你的 GitHub
2. 打开 https://dash.cloudflare.com/ → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
3. 选你的 GitHub 仓库
4. 配置：
   - Framework preset：**None**
   - Build command：`npm run build`
   - Build output directory：`dist`
   - Production branch：`main`
5. （可选）添加环境变量（如不配，将使用代码内 fallback）：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. 点 **Save and Deploy** → 等 1-2 分钟
7. 拿到 URL（如 `https://office-todo.pages.dev`）

### 第 5 步：开始用

1. 打开公网 URL → 注册账号 → 创建团队 → 拿到 6 位邀请码
2. 同事用邀请码加入同一团队
3. 任何成员创建/修改任务、发私信 → 其他成员 5 秒内看到更新

## 角色权限

- **队长**（团队创建者）：可查看全部任务，可修改/删除/归档任意任务，可指派负责人
- **队员**：只能看到分配给自己的任务，可添加新任务（自动指派给自己），可修改分配给自己的任务（标题、描述、状态、进度、截止日、优先级、标签、归档），不能修改他人任务、不能删除任务、不能指派负责人

## 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 配置 .env 文件（复制 .env.example）
#    VITE_SUPABASE_URL=https://xxx.supabase.co
#    VITE_SUPABASE_ANON_KEY=eyJhbGci...

# 3. 启动
npm run dev

# 打开 http://localhost:5173/
```

## 项目结构

```
.
├── src/
│   ├── components/              # React 组件
│   ├── store/todoStore.ts       # Zustand store：调用 API + 轮询同步 + 权限守卫
│   ├── features/filters.ts      # 任务过滤/排序 + 角色可见性过滤
│   ├── lib/api.ts               # supabase-js 封装 + 业务逻辑
│   ├── lib/supabase.ts          # Supabase 客户端初始化
│   └── lib/socket.ts            # 轮询客户端（5s 间隔）
├── supabase/
│   └── schema.sql               # 建表 + 索引 + RLS 策略（驼峰列名加双引号）
├── .env.example                 # 环境变量模板
└── vite.config.ts
```

## 免费层限制

- **Supabase Free**：500MB 数据库 + 1GB 带宽 + 50000 月活用户
- **Cloudflare Pages Free**：无限带宽 + 自动 SSL + 自动部署 + 每次 push 触发构建
- 个人/小团队完全够用

## 关键设计

- **进度/状态联动**：progress=100→done；done→100%；todo→0%；in_progress 且 progress=0→10%
- **会话 ID**：`[a,b].sort().join(":")` 保证双向一致
- **邀请码**：6 位字母数字（去除易混淆字符 O/I/0/1）
- **轮询同步**：5 秒间隔，前端定期拉取全量数据
- **RLS 策略**：anon 角色允许全部操作（内部工具，权限由前端业务逻辑控制）
- **密码安全**：前端 SHA-256 哈希 + 随机盐值，数据库不存储明文
- **跨设备登录**：用户名 + 密码换取 userId，本机持久化，下次自动进入上次团队
