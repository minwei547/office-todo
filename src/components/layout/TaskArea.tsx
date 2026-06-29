import { useMemo } from "react";
import { Columns3, List, Search } from "lucide-react";
import { QuickAddBar } from "@/components/task/QuickAddBar";
import { TaskList } from "@/components/task/TaskList";
import { TaskBoard } from "@/components/task/TaskBoard";
import { useTodoStore, selectCurrentTeam } from "@/store/todoStore";
import { useUIStore } from "@/store/uiStore";
import { filterAndSort, groupByStatus } from "@/features/filters";
import type { TaskStatus } from "@/types";
import { STATUS_LABEL } from "@/types";

export function TaskArea() {
  const team = useTodoStore(selectCurrentTeam);
  const tasks = useTodoStore((s) => s.tasks);
  const currentMemberId = useTodoStore((s) => s.currentMemberId);
  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);
  const filter = useUIStore((s) => s.filter);
  const sort = useUIStore((s) => s.sort);
  const showArchived = useUIStore((s) => s.showArchived);
  const patchFilter = useUIStore((s) => s.patchFilter);

  const isOwner = !!(team && currentMemberId && team.ownerId === currentMemberId);

  const visible = useMemo(
    () =>
      team
        ? filterAndSort(tasks, team.teamId, filter, sort, showArchived, currentMemberId, isOwner)
        : [],
    [tasks, team, filter, sort, showArchived, currentMemberId, isOwner],
  );

  const grouped = useMemo(() => groupByStatus(visible), [visible]);

  if (!team) {
    return (
      <div className="flex-1 grid place-items-center p-8">
        <EmptyState
          title="尚未加入任何团队"
          hint="点击右上角创建或加入一个团队，开始协同记录待办。"
        />
      </div>
    );
  }

  if (Object.values(tasks).filter((t) => t.teamId === team.teamId).length === 0) {
    return (
      <div className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto">
        <QuickAddBar />
        <div className="flex-1 grid place-items-center">
          <EmptyState
            title="还没有任务"
            hint="从上方输入框开始第一件事，回车即可创建。"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="px-4 sm:px-6 py-4 space-y-4">
        <QuickAddBar />

        {/* 顶部工具栏：搜索 + 视图切换 */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              value={filter.keyword}
              onChange={(e) => patchFilter({ keyword: e.target.value })}
              placeholder="搜索任务标题、描述、标签…"
              className="w-full h-9 pl-9 pr-3 text-[13px] bg-bg-soft border border-line rounded-md focus:outline-none focus:border-mint focus:bg-surface focus:ring-4 focus:ring-mint/25 placeholder:text-dim transition-all"
            />
          </div>
          <div className="flex items-center gap-1 bg-bg-soft border border-line rounded-md p-1">
            <ViewButton
              active={view === "list"}
              onClick={() => setView("list")}
              icon={<List size={13} />}
              label="列表"
            />
            <ViewButton
              active={view === "board"}
              onClick={() => setView("board")}
              icon={<Columns3 size={13} />}
              label="看板"
            />
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="grid place-items-center py-16">
            <EmptyState
              title="没有匹配的任务"
              hint="尝试调整筛选条件或清空关键词。"
            />
          </div>
        ) : view === "list" ? (
          <TaskList tasks={visible} />
        ) : (
          <TaskBoard
            columns={(["todo", "in_progress", "done"] as TaskStatus[]).map(
              (status) => ({
                status,
                tasks: grouped[status],
              }),
            )}
          />
        )}

        <div className="pt-4 pb-2 mono-meta text-center">
          共 {visible.length} 项 · {STATUS_LABEL.todo} / {STATUS_LABEL.in_progress} / {STATUS_LABEL.done}
          {showArchived ? " · 含归档" : ""}
        </div>
      </div>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 h-7 px-3 text-[12px] font-medium rounded transition-colors ${
        active
          ? "bg-surface text-ink shadow-sm"
          : "text-muted hover:text-ink"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="text-center max-w-sm">
      {/* 马卡龙光圈插画 */}
      <div className="relative mx-auto mb-4 w-32 h-20">
        <div className="absolute inset-0 grid place-items-center">
          <div className="absolute w-20 h-20 rounded-full bg-mint-gradient opacity-30 blur-2xl animate-pulse" />
          <svg
            viewBox="0 0 120 80"
            className="relative w-32 h-auto text-[#4a7a68]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          >
            <rect x="20" y="14" width="80" height="56" rx="8" />
            <path d="M30 30 H86 M30 44 H70 M30 56 H60" strokeLinecap="round" />
            <circle cx="92" cy="20" r="3" fill="currentColor" stroke="none" />
            <path d="M14 70 L26 60 L38 70" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M82 70 L94 60 L106 70" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <h3 className="biz-title text-[20px] text-ink mb-1.5">{title}</h3>
      <p className="text-[13px] text-muted leading-relaxed">{hint}</p>
    </div>
  );
}
