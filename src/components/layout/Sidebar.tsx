import { useMemo } from "react";
import {
  Archive,
  CheckCircle2,
  Clock,
  Filter as FilterIcon,
  ListFilter,
  RotateCcw,
  TriangleAlert,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { CountBadge } from "@/components/ui/Badge";
import { useTodoStore, selectCurrentTeam } from "@/store/todoStore";
import { useUIStore } from "@/store/uiStore";
import { collectMembers, collectTags, computeStats } from "@/features/stats";
import { DEFAULT_FILTER } from "@/features/filters";
import type { Priority, SortKey, TaskStatus } from "@/types";

const STATUS_OPTIONS: { value: TaskStatus | "all"; label: string }[] = [
  { value: "all", label: "全部状态" },
  { value: "todo", label: "待办" },
  { value: "in_progress", label: "进行中" },
  { value: "done", label: "已完成" },
];

const PRIORITY_OPTIONS: { value: Priority | "all"; label: string; color: string }[] = [
  { value: "all", label: "全部", color: "#8B8BAE" },
  { value: "urgent", label: "紧急", color: "#EF4444" },
  { value: "high", label: "高", color: "#C084FC" },
  { value: "medium", label: "中", color: "#F4F4FB" },
  { value: "low", label: "低", color: "#8B8BAE" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "dueDate", label: "截止日" },
  { value: "priority", label: "优先级" },
  { value: "createdAt", label: "创建时间" },
];

export function Sidebar() {
  const team = useTodoStore(selectCurrentTeam);
  const tasks = useTodoStore((s) => s.tasks);
  const members = useTodoStore((s) => s.members);

  const filter = useUIStore((s) => s.filter);
  const patchFilter = useUIStore((s) => s.patchFilter);
  const resetFilter = useUIStore((s) => s.resetFilter);
  const sort = useUIStore((s) => s.sort);
  const setSort = useUIStore((s) => s.setSort);
  const showArchived = useUIStore((s) => s.showArchived);
  const toggleShowArchived = useUIStore((s) => s.toggleShowArchived);

  const stats = useMemo(
    () => (team ? computeStats(tasks, team.teamId) : null),
    [tasks, team],
  );
  const teamMembers = useMemo(
    () => (team ? collectMembers(members, team.teamId) : []),
    [members, team],
  );
  const tags = useMemo(
    () => (team ? collectTags(tasks, team.teamId) : []),
    [tasks, team],
  );

  if (!team) return null;

  const hasFilter =
    JSON.stringify(filter) !== JSON.stringify(DEFAULT_FILTER);

  return (
    <aside className="hidden lg:flex flex-col w-[260px] shrink-0 bg-bg-soft/40 border-r border-white/[0.06] overflow-y-auto backdrop-blur-xl">
      {/* 统计概览 */}
      <section className="px-5 py-4 border-b border-white/[0.05]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted">
            团队概览
          </h2>
          <CountBadge tone="neutral">{stats?.total ?? 0}</CountBadge>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            icon={<Clock size={13} />}
            label="待办"
            value={stats?.todo ?? 0}
            tone="neutral"
          />
          <StatCard
            icon={<ListFilter size={13} />}
            label="进行中"
            value={stats?.in_progress ?? 0}
            tone="accent"
          />
          <StatCard
            icon={<CheckCircle2 size={13} />}
            label="今日完成"
            value={stats?.doneToday ?? 0}
            tone="success"
          />
          <StatCard
            icon={<TriangleAlert size={13} />}
            label="已逾期"
            value={stats?.overdue ?? 0}
            tone="danger"
          />
        </div>
      </section>

      {/* 筛选 */}
      <section className="px-5 py-4 border-b border-white/[0.05]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted flex items-center gap-1.5">
            <FilterIcon size={12} /> 筛选
          </h2>
          {hasFilter ? (
            <button
              onClick={resetFilter}
              className="mono-meta hover:text-accent-soft flex items-center gap-1"
            >
              <RotateCcw size={11} /> 重置
            </button>
          ) : null}
        </div>

        {/* 状态 */}
        <FilterGroup label="状态">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                active={filter.status === opt.value}
                onClick={() => patchFilter({ status: opt.value })}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </FilterGroup>

        {/* 优先级 */}
        <FilterGroup label="优先级">
          <div className="flex flex-wrap gap-1.5">
            {PRIORITY_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                active={filter.priority === opt.value}
                onClick={() => patchFilter({ priority: opt.value })}
                leadingDot={opt.color}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </FilterGroup>

        {/* 负责人 */}
        <FilterGroup label="负责人">
          <div className="flex flex-wrap gap-1.5 items-center">
            <Chip
              active={filter.assigneeId === "all"}
              onClick={() => patchFilter({ assigneeId: "all" })}
            >
              全部
            </Chip>
            <Chip
              active={filter.assigneeId === "unassigned"}
              onClick={() => patchFilter({ assigneeId: "unassigned" })}
            >
              未指派
            </Chip>
            {teamMembers.map((m) => (
              <button
                key={m.memberId}
                onClick={() => patchFilter({ assigneeId: m.memberId })}
                className={`flex items-center gap-1.5 h-6 px-1.5 border rounded-lg transition-colors ${
                  filter.assigneeId === m.memberId
                    ? "bg-accent/15 text-accent-soft border-accent/40"
                    : "bg-white/[0.04] border-white/[0.08] hover:border-white/[0.18]"
                }`}
                title={m.nickname}
              >
                <Avatar char={m.avatarChar} size="xs" />
                <span className="text-[11px] font-medium max-w-[60px] truncate">
                  {m.nickname}
                </span>
              </button>
            ))}
          </div>
        </FilterGroup>

        {/* 标签 */}
        {tags.length > 0 ? (
          <FilterGroup label="标签">
            <div className="flex flex-wrap gap-1.5">
              <Chip
                active={filter.tag === "all"}
                onClick={() => patchFilter({ tag: "all" })}
              >
                全部
              </Chip>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  active={filter.tag === tag}
                  onClick={() => patchFilter({ tag })}
                >
                  #{tag}
                </Chip>
              ))}
            </div>
          </FilterGroup>
        ) : null}
      </section>

      {/* 排序与显示 */}
      <section className="px-5 py-4 border-b border-white/[0.05]">
        <FilterGroup label="排序方式">
          <div className="flex flex-wrap gap-1.5">
            {SORT_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                active={sort === opt.value}
                onClick={() => setSort(opt.value)}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </FilterGroup>
        <FilterGroup label="显示" className="mt-3">
          <button
            onClick={toggleShowArchived}
            className={`flex items-center gap-1.5 h-7 px-2.5 text-[12px] border rounded-lg transition-colors w-full justify-between ${
              showArchived
                ? "bg-accent/15 text-accent-soft border-accent/40"
                : "bg-white/[0.04] text-ink/75 border-white/[0.08] hover:border-white/[0.18]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Archive size={12} /> 归档任务
            </span>
            <span>{showArchived ? "显示中" : "隐藏中"}</span>
          </button>
        </FilterGroup>
      </section>

      {/* 成员列表 */}
      <section className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted">
            团队成员 ({teamMembers.length})
          </h2>
        </div>
        <ul className="space-y-1">
          {teamMembers.map((m) => (
            <li
              key={m.memberId}
              className="flex items-center justify-between gap-2 px-1 py-1 hover:bg-white/[0.04] rounded-lg"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Avatar char={m.avatarChar} size="sm" />
                <span className="text-[13px] text-ink/85 truncate">
                  {m.nickname}
                </span>
                {team.ownerId === m.memberId ? (
                  <span className="mono-meta text-accent-soft">owner</span>
                ) : null}
              </div>
              <CountBadge tone="neutral">
                {stats?.byAssignee[m.memberId] ?? 0}
              </CountBadge>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "neutral" | "accent" | "success" | "danger";
}) {
  const toneClass = {
    neutral: "text-ink/80 border-white/[0.08]",
    accent: "text-accent-soft border-accent/30 bg-accent/5",
    success: "text-success border-success/30 bg-success/5",
    danger: "text-danger border-danger/30 bg-danger/5",
  }[tone];
  return (
    <div
      className={`flex items-center justify-between px-2.5 py-2 border rounded-lg ${toneClass}`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="shrink-0">{icon}</span>
        <span className="text-[11px] truncate">{label}</span>
      </div>
      <span className="font-mono text-[15px] font-semibold tabular-nums">
        {value}
      </span>
    </div>
  );
}

function FilterGroup({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-3 last:mb-0 ${className}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted/80 mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}

// 移动端的简化筛选条
export function MobileFilterBar() {
  const filter = useUIStore((s) => s.filter);
  const patchFilter = useUIStore((s) => s.patchFilter);
  const hasFilter =
    JSON.stringify(filter) !== JSON.stringify(DEFAULT_FILTER);
  if (!hasFilter) return null;
  return (
    <div className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white/[0.04] border-b border-white/[0.05] overflow-x-auto">
      <span className="mono-meta whitespace-nowrap">筛选中：</span>
      {filter.status !== "all" ? (
        <Chip onClick={() => patchFilter({ status: "all" })}>
          {filter.status} <X size={11} />
        </Chip>
      ) : null}
      {filter.priority !== "all" ? (
        <Chip onClick={() => patchFilter({ priority: "all" })}>
          {filter.priority} <X size={11} />
        </Chip>
      ) : null}
      {filter.tag !== "all" ? (
        <Chip onClick={() => patchFilter({ tag: "all" })}>
          #{filter.tag} <X size={11} />
        </Chip>
      ) : null}
    </div>
  );
}
