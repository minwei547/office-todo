import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Avatar } from "@/components/ui/Avatar";
import { PriorityBadge, StatusBadge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/task/ProgressBar";
import { useUIStore } from "@/store/uiStore";

interface Section {
  id: string;
  title: string;
  intro: string;
  blocks: Block[];
}

type Block =
  | { kind: "para"; text: string }
  | { kind: "steps"; items: string[] }
  | { kind: "tip"; text: string }
  | { kind: "example"; label: string; render: () => React.ReactNode }
  | { kind: "keys"; items: { keys: string[]; desc: string }[] };

const SECTIONS: Section[] = [
  {
    id: "start",
    title: "01 · 入门：加入或创建团队",
    intro: "本平台无账号密码，以「昵称 + 团队」轻量进入。首次打开会自动弹出入门弹窗。",
    blocks: [
      {
        kind: "steps",
        items: [
          "点击右上角「加入 / 创建团队」按钮，弹出入门弹窗。",
          "选择「创建新团队」标签，填写你的昵称（如：林溪）与团队名称（如：行政事务组）。",
          "点击「创建并进入团队」，系统会生成一个 6 位邀请码，例如 ABK7QP。",
          "把邀请码分享给同事，他们选择「加入现有团队」标签，填昵称 + 邀请码即可进入同一团队。",
        ],
      },
      {
        kind: "example",
        label: "示例：邀请码与团队栏",
        render: () => (
          <div className="flex items-center gap-3 px-3 h-10 bg-white/[0.04] border border-white/[0.08] rounded-lg">
            <div className="h-5 w-5 grid place-items-center bg-accent-gradient text-white rounded-lg">
              <span className="font-sans font-semibold text-[11px]">辑</span>
            </div>
            <span className="font-sans text-[14px]">行政事务组</span>
            <span className="mono-meta">· ABK7QP</span>
            <div className="flex-1" />
            <Avatar char="林" size="xs" />
            <span className="text-[12px]">林溪</span>
          </div>
        ),
      },
      {
        kind: "tip",
        text: "团队成员数据存储在每位成员的浏览器本地。同事要用同一邀请码加入后，才能看到彼此的昵称和派发任务。",
      },
    ],
  },
  {
    id: "create",
    title: "02 · 创建任务",
    intro: "顶部常驻「快速新建任务」输入框，回车即可创建，点击展开可补充优先级、截止日、负责人、标签。",
    blocks: [
      {
        kind: "steps",
        items: [
          "在顶部输入框输入任务标题，例如「整理本月报销单据」。",
          "（可选）点击输入框展开属性条：选择优先级、截止日期、指派给某位成员、添加标签。",
          "按回车 或 点击「添加」按钮，任务立即出现在所有成员的清单中。",
          "创建后会自动打开任务详情抽屉，可继续补充描述。",
        ],
      },
      {
        kind: "example",
        label: "示例：一条已创建的任务",
        render: () => (
          <div className="biz-card rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="h-5 w-5 grid place-items-center rounded-full border border-white/[0.18]">
                <span className="h-2 w-2 rounded-full bg-ink/20" />
              </span>
              <span className="font-sans text-[15px]">整理本月报销单据</span>
            </div>
            <div className="flex items-center gap-2 mt-2 pl-7">
              <PriorityBadge priority="high" />
              <span className="font-mono text-[10px] text-accent-soft">明天</span>
              <span className="text-[10px] text-muted">#财务 #月度</span>
            </div>
            <div className="mt-2 pl-7">
              <ProgressBar progress={30} status="in_progress" showLabel />
            </div>
          </div>
        ),
      },
      {
        kind: "keys",
        items: [
          { keys: ["Enter"], desc: "在输入框中创建任务" },
          { keys: ["Esc"], desc: "清空输入并收起展开属性" },
        ],
      },
    ],
  },
  {
    id: "detail",
    title: "03 · 任务详情与进度",
    intro: "点击任意任务卡片即可打开右侧详情抽屉，可编辑标题、描述、负责人、截止日、优先级、标签，并拖动滑块调整完成进度。",
    blocks: [
      {
        kind: "steps",
        items: [
          "在清单或看板中点击任务卡片 → 右侧滑出详情抽屉。",
          "点击标题直接编辑；点击描述区域补充背景说明（失焦自动保存）。",
          "在「完成进度」区块拖动滑块，或点击 0 / 25 / 50 / 75 / 100% 快捷按钮。",
          "进度 = 100% 时任务自动标记为「已完成」；把状态切回「待办」时进度归零。",
        ],
      },
      {
        kind: "example",
        label: "示例：进度联动状态",
        render: () => (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <StatusBadge status="todo" />
              <ProgressBar progress={0} status="todo" showLabel />
              <span className="text-[11px] text-muted">未开始</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status="in_progress" />
              <ProgressBar progress={60} status="in_progress" showLabel />
              <span className="text-[11px] text-muted">进行中</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status="done" />
              <ProgressBar progress={100} status="done" showLabel />
              <span className="text-[11px] text-success">已完成</span>
            </div>
          </div>
        ),
      },
      {
        kind: "tip",
        text: "所有变更（创建、指派、改状态、改进度、留言）都会被自动记录在底部的「活动记录」时间线中，便于团队追溯。",
      },
    ],
  },
  {
    id: "filter",
    title: "04 · 筛选、排序与视图",
    intro: "左侧栏提供统计概览与筛选条件，顶部可切换列表/看板视图，并按关键字搜索。",
    blocks: [
      {
        kind: "steps",
        items: [
          "左侧「团队概览」实时显示待办、进行中、今日完成、已逾期数量。",
          "在「筛选」区按状态、优先级、负责人、标签点击 chip 进行筛选；点击「重置」恢复全部。",
          "顶部搜索框输入关键字，可同时匹配标题、描述、标签。",
          "右上「列表 / 看板」按钮切换视图：看板按 待办 / 进行中 / 已完成 三列展示。",
          "「排序方式」可按截止日、优先级、创建时间排序；逾期任务自动上浮，已完成自动沉底。",
        ],
      },
      {
        kind: "example",
        label: "示例：看板视图三列布局",
        render: () => (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "待办", count: 2, tone: "neutral" },
              { label: "进行中", count: 1, tone: "accent" },
              { label: "已完成", count: 3, tone: "success" },
            ].map((col) => (
              <div
                key={col.label}
                className="border border-white/[0.08] rounded-lg p-2 bg-white/[0.02]"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
                    {col.label}
                  </span>
                  <span className="mono-meta">{col.count}</span>
                </div>
                <div className="h-8 bg-bg-soft border border-white/[0.06] rounded-lg" />
              </div>
            ))}
          </div>
        ),
      },
      {
        kind: "tip",
        text: "「显示」分组下可切换是否显示归档任务。已完成的任务可在详情抽屉中点击「归档」收起，保持主清单清爽。",
      },
    ],
  },
  {
    id: "dm",
    title: "05 · 私信",
    intro: "团队栏右上的「消息」图标进入私信抽屉，可与其他成员一对一沟通，新消息有未读徽章提示。",
    blocks: [
      {
        kind: "steps",
        items: [
          "点击右上「消息」图标打开私信抽屉。",
          "在「团队成员」区点击任意成员，进入与该成员的对话。",
          "底部输入框输入消息，回车发送，Shift + 回车换行。",
          "对方（同一团队其他成员）打开私信抽屉即可看到这条消息，未读数会显示在团队栏徽章与列表项右侧。",
          "进入对话后未读消息自动标记为已读。",
        ],
      },
      {
        kind: "example",
        label: "示例：一段对话",
        render: () => (
          <div className="space-y-2">
            <div className="flex items-end gap-2">
              <Avatar char="林" size="xs" />
              <div className="max-w-[78%] px-3 py-2 text-[12px] bg-white/[0.04] text-ink border border-white/[0.08] rounded-[4px]">
                报销单据我整理了一半，今天能交。
                <div className="mt-1 text-[10px] font-mono text-muted">10:24</div>
              </div>
            </div>
            <div className="flex items-end gap-2 flex-row-reverse">
              <Avatar char="阿" size="xs" />
              <div className="max-w-[78%] px-3 py-2 text-[12px] bg-accent-gradient text-white border border-accent/40 rounded-[4px]">
                好的，我下午一起核对。
                <div className="mt-1 text-[10px] font-mono text-white/70">10:26</div>
              </div>
            </div>
          </div>
        ),
      },
      {
        kind: "tip",
        text: "私信仅限同一团队成员之间。数据与任务一样存储在浏览器本地，可随团队数据一起导出。",
      },
    ],
  },
  {
    id: "data",
    title: "06 · 团队设置与数据",
    intro: "右上「齿轮」打开团队设置抽屉，可重命名团队、修改昵称、导入导出 JSON、清空团队。",
    blocks: [
      {
        kind: "steps",
        items: [
          "点击齿轮图标进入团队设置抽屉。",
          "「我的信息」区可修改昵称（团队内显示名）。",
          "「数据管理」区点击「导出 JSON」下载团队数据备份文件。",
          "在新设备上「导入 JSON」选择备份文件即可恢复全部任务、备注、活动与私信。",
          "团队所有者（owner）可在「危险区」清空并删除整个团队。",
        ],
      },
      {
        kind: "example",
        label: "示例：导出的 JSON 结构（节选）",
        render: () => (
          <pre className="text-[11px] font-mono leading-relaxed bg-white/[0.04] border border-white/[0.08] rounded-lg p-3 overflow-x-auto text-ink/85">
{`{
  "teams": { "t_xxx": {
    "teamName": "行政事务组",
    "inviteCode": "ABK7QP"
  }},
  "tasks": { "k_yyy": {
    "title": "整理本月报销单据",
    "status": "in_progress",
    "progress": 60
  }},
  "messages": { ... }
}`}
          </pre>
        ),
      },
      {
        kind: "tip",
        text: "同一台电脑打开多个标签页会自动实时同步：在 A 标签改任务，B 标签立即更新，无需刷新。",
      },
    ],
  },
];

export function HelpDrawer() {
  const open = useUIStore((s) => s.helpDrawerOpen);
  const setOpen = useUIStore((s) => s.setHelpDrawer);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(SECTIONS.map((s) => s.id)),
  );

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Drawer
      open={open}
      onClose={() => setOpen(false)}
      title={
        <span className="flex items-center gap-2">
          <BookOpen size={16} className="text-accent-soft" />
          使用说明
        </span>
      }
      subtitle="共 6 个章节 · 点击章节标题折叠 / 展开"
      widthClass="w-[520px] max-w-[94vw]"
    >
      {/* 引子 */}
      <div className="mb-5 px-3 py-3 bg-white/[0.04] border-l-2 border-accent rounded-r-lg">
        <p className="text-[13px] leading-relaxed text-ink/85">
          这是一个面向小型办公室的<strong>共享待办清单</strong>：
          团队成员在同一张清单上协作创建、指派、追踪任务，
          实时同步状态，让团队对「谁在做什么、什么还没做」一目了然。
          本平台为纯前端应用，数据存储在浏览器本地，无需账号密码。
        </p>
      </div>

      {/* 目录 */}
      <nav className="mb-5 biz-card rounded-lg p-3">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted mb-2">
          目录
        </div>
        <ol className="grid grid-cols-2 gap-x-3 gap-y-1">
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#help-${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById(`help-${s.id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  if (!expanded.has(s.id)) toggle(s.id);
                }}
                className="flex items-center gap-1.5 text-[12px] text-ink/75 hover:text-accent-soft"
              >
                <span className="font-mono text-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="truncate">{s.title.replace(/^\d+\s·\s/, "")}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* 章节 */}
      <div className="space-y-4">
        {SECTIONS.map((section) => {
          const isOpen = expanded.has(section.id);
          return (
            <section
              key={section.id}
              id={`help-${section.id}`}
              className="biz-card rounded-lg overflow-hidden scroll-mt-4"
            >
              <button
                onClick={() => toggle(section.id)}
                className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
              >
                {isOpen ? (
                  <ChevronDown size={14} className="text-muted shrink-0" />
                ) : (
                  <ChevronRight size={14} className="text-muted shrink-0" />
                )}
                <h2 className="biz-title text-[15px] text-ink">
                  {section.title}
                </h2>
              </button>
              {isOpen ? (
                <div className="px-4 pb-4 pt-1 animate-fade-up">
                  <p className="text-[12px] text-muted leading-relaxed mb-3">
                    {section.intro}
                  </p>
                  <div className="space-y-3">
                    {section.blocks.map((block, idx) => (
                      <BlockView key={idx} block={block} />
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      {/* 页脚 */}
      <div className="mt-6 pt-4 border-t border-white/[0.06] mono-meta text-center leading-relaxed">
        数据存储于浏览器本地 · 同设备多标签自动同步
        <br />
        跨设备迁移请使用「团队设置 → 导入 / 导出 JSON」
      </div>
    </Drawer>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "para":
      return (
        <p className="text-[13px] text-ink/85 leading-relaxed">{block.text}</p>
      );
    case "steps":
      return (
        <ol className="space-y-1.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13px] text-ink/85">
              <span className="shrink-0 h-5 w-5 grid place-items-center bg-accent-gradient text-white rounded-full font-mono text-[10px] font-semibold mt-0.5">
                {i + 1}
              </span>
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ol>
      );
    case "tip":
      return (
        <div className="flex items-start gap-2 px-3 py-2 bg-accent/10 border-l-2 border-accent rounded-r-lg">
          <span className="font-sans font-semibold text-accent-soft text-[13px] shrink-0">
            提示
          </span>
          <span className="text-[12px] text-ink/80 leading-relaxed">
            {block.text}
          </span>
        </div>
      );
    case "example":
      return (
        <div className="border border-white/[0.08] rounded-lg overflow-hidden">
          <div className="px-3 py-1.5 bg-white/[0.04] border-b border-white/[0.06] flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-gradient" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
              示例 · {block.label}
            </span>
          </div>
          <div className="p-3 bg-bg-soft">{block.render()}</div>
        </div>
      );
    case "keys":
      return (
        <div className="flex flex-wrap gap-2">
          {block.items.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg"
            >
              <span className="flex items-center gap-1">
                {item.keys.map((k) => (
                  <kbd
                    key={k}
                    className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-bg-soft border border-white/[0.18] rounded-lg font-mono text-[10px] font-semibold text-ink shadow-paper"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
              <span className="text-[12px] text-ink/75">{item.desc}</span>
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}
