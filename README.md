# 办公室共享待办清单

一张共享清单，让全队知道「谁在做什么、什么还没做」。支持任务看板、活动记录、私信、实时同步。

## 技术栈

- **前端**：React 18 + Vite + TypeScript + Zustand + Tailwind + @supabase/supabase-js
- **后端**：Supabase PostgreSQL（无服务器，无 Edge Function）
- **实时**：轮询同步（2.5s 间隔）
- **认证**：基于 localStorage 的 memberId

## 部署步骤（纯网页操作，无需 CLI，无需信用卡）

### 第 1 步：创建 Supabase 项目

1. 打开 https://supabase.com/ → 点 **Start your project** → 用 GitHub 登录
2. **New Project**：
   - Project Name：`office-todo`
   - Database Password：自己设一个（记好）
   - Region：选最近的（如 Northeast Asia - Tokyo）
   - 点 **Create new project**
3. 等 1-2 分钟，状态变成 **Ready**

### 第 2 步：执行建表 SQL

1. Supabase 左侧菜单 → **SQL Editor** → **New query**
2. 把 `supabase/schema.sql` 文件的**全部内容**复制粘贴进去
3. 点 **Run**（绿色按钮）
4. 底部出现 `✅ 建表完成！共创建 6 张表 + 8 个索引 + 6 条 RLS 策略` 就成功了

### 第 3 步：拿到 API 密钥

1. Supabase 左侧 → **Settings**（齿轮图标）→ **API**
2. 找到以下两个值，**记下来**：
   - **Project URL**：`https://xxxxx.supabase.co`
   - **anon public key**：`eyJhbGciOiJIUzI1NiIsInR5...`（一长串）

### 第 4 步：部署前端到 Vercel

1. 打开 https://vercel.com/ → 用 GitHub 登录
2. **Add New...** → **Project** → 选你的 GitHub 仓库
3. 配置：
   - Framework Preset：**Vite**
   - Root Directory：`./`（默认）
   - **Environment Variables**（重要！）添加两个：
     - `VITE_SUPABASE_URL` = 第 3 步拿到的 Project URL
     - `VITE_SUPABASE_ANON_KEY` = 第 3 步拿到的 anon public key
4. 点 **Deploy** → 等 2-3 分钟
5. 部署完成 → 拿到 URL（如 `https://office-todo.vercel.app`）

### 第 5 步：开始用

1. 打开公网 URL → 弹「创建团队」→ 输入昵称+团队名 → 拿到邀请码
2. 点右上角「邀请同事」→ 出二维码 + 邀请链接
3. 同事打开链接 → 输入邀请码 → 加入团队
4. 任何成员创建/修改任务、发私信 → 其他成员 2-3 秒内看到更新

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
│   ├── store/todoStore.ts       # Zustand store：调用 API + 轮询同步
│   ├── lib/api.ts               # supabase-js 封装 + 业务逻辑
│   ├── lib/supabase.ts          # Supabase 客户端初始化
│   └── lib/socket.ts            # 轮询客户端（2.5s 间隔）
├── supabase/
│   └── schema.sql               # 建表 + RLS 策略脚本
├── .env.example                 # 环境变量模板
└── vite.config.ts
```

## 免费层限制

- **Supabase Free**：500MB 数据库 + 1GB 带宽 + 50000 月活用户
- **Vercel Free**：100GB 带宽 + 自动 SSL + 自动部署
- 个人/小团队完全够用

## 关键设计

- **进度/状态联动**：progress=100→done；done→100%；todo→0%；in_progress 且 progress=0→10%
- **会话 ID**：`[a,b].sort().join(":")` 保证双向一致
- **邀请码**：6 位字母数字（去除易混淆字符 O/I/0/1）
- **轮询同步**：2.5 秒间隔，前端定期拉取全量数据
- **RLS 策略**：anon 角色允许全部操作（内部工具，不做细粒度权限）
