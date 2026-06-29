import { useMemo, useState } from "react";
import {
  Archive,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Flag,
  Loader2,
  MessageCircle,
  Send,
  Trash2,
  User,
  RotateCcw,
} from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextArea } from "@/components/ui/Field";
import { PriorityBadge, StatusBadge } from "@/components/ui/Badge";
import { ProgressBar } from "./ProgressBar";
import {
  useTodoStore,
  selectCurrentMember,
  selectIsOwner,
  makeSelectCanEditTask,
} from "@/store/todoStore";
import { useUIStore } from "@/store/uiStore";
import type { Priority, TaskStatus } from "@/types";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/types";
import { describeDueDate, relativeTime, todayISO } from "@/lib/date";

const STATUS_FLOW: TaskStatus[] = ["todo", "in_progress", "done"];

const STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  todo: <Circle size={14} />,
  in_progress: <Loader2 size={14} className="animate-spin" />,
  done: <CheckCircle2 size={14} />,
};

const ACTIVITY_LABEL: Record<string, string> = {
  created: "创建任务",
  assigned: "指派负责人",
  status_changed: "变更状态",
  edited: "编辑任务",
  completed: "标记完成",
  note_added: "添加备注",
};

const PRIORITY_OPTIONS: Priority[] = ["low", "medium", "high", "urgent"];

export function TaskDetailDrawer() {
  const selectedTaskId = useUIStore((s) => s.selectedTaskId);
  const closeTask = useUIStore((s) => s.closeTask);

  const task = useTodoStore((s) =>
    selectedTaskId ? s.tasks[selectedTaskId] : null,
  );
  const members = useTodoStore((s) => s.members);
  const notes = useTodoStore((s) => s.notes);
  const activities = useTodoStore((s) => s.activities);
  const currentMember = useTodoStore(selectCurrentMember);
  const isOwner = useTodoStore(selectIsOwner);
  const canEdit = useTodoStore(makeSelectCanEditTask(selectedTaskId));
  const updateTask = useTodoStore((s) => s.updateTask);
  const setTaskStatus = useTodoStore((s) => s.setTaskStatus);
  const setTaskProgress = useTodoStore((s) => s.setTaskProgress);
  const assignTask = useTodoStore((s) => s.assignTask);
  const archiveTask = useTodoStore((s) => s.archiveTask);
  const restoreTask = useTodoStore((s) => s.restoreTask);
  const deleteTask = useTodoStore((s) => s.deleteTask);
  const addNote = useTodoStore((s) => s.addNote);

  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");

  const teamMembers = useMemo(
    () =>
      task
        ? Object.values(members).filter((m) => m.teamId === task.teamId)
        : [],
    [members, task],
  );

  const taskNotes = useMemo(
    () =>
      task
        ? Object.values(notes)
            .filter((n) => n.taskId === task.taskId)
            .sort((a, b) => b.timestamp - a.timestamp)
        : [],
    [notes, task],
  );

  const taskActivities = useMemo(
    () =>
      task
        ? Object.values(activities)
            .filter((a) => a.taskId === task.taskId)
            .sort((a, b) => b.timestamp - a.timestamp)
        : [],
    [activities, task],
  );

  if (!task) {
    return null;
  }

  const due = describeDueDate(task.dueDate, task.status === "done");
  const assignee = task.assigneeId ? members[task.assigneeId] : null;

  function saveTitle(value: string) {
    const t = value.trim();
    if (t && t !== task!.title) updateTask(task!.taskId, { title: t });
    setEditingTitle(false);
  }

  function saveDesc(value: string) {
    if (value !== task!.description) {
      updateTask(task!.taskId, { description: value });
    }
    setEditingDesc(false);
  }

  function addTag() {
    const t = tagDraft.trim().replace(/^#/, "");
    if (!t) return;
    if (task!.tags.includes(t)) {
      setTagDraft("");
      return;
    }
    updateTask(task!.taskId, { tags: [...task!.tags, t] });
    setTagDraft("");
  }

  function removeTag(t: string) {
    updateTask(task!.taskId, { tags: task!.tags.filter((x) => x !== t) });
  }

  function submitNote() {
    const text = noteDraft.trim();
    if (!text) return;
    addNote(task!.taskId, text);
    setNoteDraft("");
  }

  return (
    <Drawer
      open={!!selectedTaskId}
      onClose={closeTask}
      title={
        editingTitle && canEdit ? (
          <input
            key={`title-${task.taskId}`}
            autoFocus
            defaultValue={task.title}
            onBlur={(e) => saveTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setEditingTitle(false);
            }}
            className="w-full bg-transparent border-b border-accent focus:outline-none"
          />
        ) : canEdit ? (
          <button
            onClick={() => setEditingTitle(true)}
            className="text-left focus-ring rounded-lg -mx-1 px-1"
          >
            {task.title}
          </button>
        ) : (
          <span className="text-left">{task.title}</span>
        )
      }
      subtitle={
        <>
          <span>#{task.taskId.slice(-6)} · 创建于 {relativeTime(task.createdAt)}</span>
          {!canEdit ? (
            <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-white/[0.06] text-muted border border-white/[0.10]">
              只读
            </span>
          ) : null}
        </>
      }
      footer={
        <div className="flex items-center gap-2">
          {canEdit && task.archived ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => restoreTask(task.taskId)}
              leadingIcon={<RotateCcw size={13} />}
            >
              恢复
            </Button>
          ) : canEdit && !task.archived ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                archiveTask(task.taskId);
                closeTask();
              }}
              leadingIcon={<Archive size={13} />}
            >
              归档
            </Button>
          ) : null}
          <div className="flex-1" />
          {isOwner ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (confirm("确定删除该任务？该操作不可撤销。")) {
                  deleteTask(task.taskId);
                  closeTask();
                }
              }}
              leadingIcon={<Trash2 size={13} />}
            >
              删除
            </Button>
          ) : null}
        </div>
      }
    >
      {/* 状态切换器 */}
      <section className="mb-5">
        <div className="flex items-center gap-1 mb-2">
          {STATUS_FLOW.map((s) => {
            const active = task.status === s;
            return (
              <button
                key={s}
                disabled={!canEdit}
                onClick={() => canEdit && setTaskStatus(task.taskId, s)}
                className={`flex-1 flex items-center justify-center gap-1.5 h-9 text-[12px] font-medium border rounded-lg transition-colors ${
                  active
                    ? s === "done"
                      ? "bg-success text-white border-success"
                      : s === "in_progress"
                        ? "bg-accent-gradient text-white border-accent/40"
                        : "bg-accent/15 text-accent-soft border-accent/40"
                    : "bg-white/[0.04] text-muted border-white/[0.08] hover:border-white/[0.18]"
                }${canEdit ? "" : " opacity-60 cursor-not-allowed"}`}
              >
                {STATUS_ICON[s]}
                {STATUS_LABEL[s]}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          {task.archived ? (
            <span className="mono-meta text-accent-soft">已归档</span>
          ) : null}
        </div>
      </section>

      {/* 进度 */}
      <section className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
            完成进度
          </span>
          <span className="font-mono text-[14px] font-semibold tabular-nums text-ink">
            {task.progress}%
          </span>
        </div>
        <ProgressBar
          progress={task.progress}
          status={task.status}
          className="mb-3"
        />
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={task.progress}
          disabled={!canEdit}
          onChange={(e) =>
            canEdit && setTaskProgress(task.taskId, Number(e.target.value))
          }
          className="w-full h-1.5 accent-accent cursor-pointer"
          aria-label="调整进度"
        />
        <div className="flex items-center justify-between mt-2 gap-1">
          {[0, 25, 50, 75, 100].map((p) => (
            <button
              key={p}
              disabled={!canEdit}
              onClick={() => canEdit && setTaskProgress(task.taskId, p)}
              className={`flex-1 h-6 text-[11px] font-mono border rounded-lg transition-colors ${
                task.progress === p
                  ? "bg-accent-gradient text-white border-accent/40"
                  : "bg-white/[0.04] text-muted border-white/[0.08] hover:border-white/[0.18]"
              }${canEdit ? "" : " opacity-60 cursor-not-allowed"}`}
            >
              {p}%
            </button>
          ))}
        </div>
        <p className="mono-meta mt-2">
          进度 100% 时自动标记为已完成；状态切换会联动进度。
        </p>
      </section>

      {/* 描述 */}
      <Field
        label="描述"
        hint={editingDesc ? "失焦保存" : undefined}
        className="mb-5"
      >
        {editingDesc && canEdit ? (
          <TextArea
            key={`desc-${task.taskId}`}
            autoFocus
            rows={4}
            defaultValue={task.description}
            onBlur={(e) => saveDesc(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditingDesc(false);
            }}
            placeholder="补充任务背景、要求、参考链接…"
          />
        ) : canEdit ? (
          <button
            onClick={() => setEditingDesc(true)}
            className="w-full text-left min-h-[60px] px-3 py-2 text-[13px] text-ink/85 bg-white/[0.04] border border-white/[0.08] rounded-lg hover:border-white/[0.18] transition-colors focus-ring"
          >
            {task.description ? (
              <span className="whitespace-pre-wrap">{task.description}</span>
            ) : (
              <span className="text-dim italic">点击补充描述…</span>
            )}
          </button>
        ) : (
          <div className="w-full text-left min-h-[60px] px-3 py-2 text-[13px] text-ink/85 bg-white/[0.04] border border-white/[0.08] rounded-lg">
            {task.description ? (
              <span className="whitespace-pre-wrap">{task.description}</span>
            ) : (
              <span className="text-dim italic">暂无描述</span>
            )}
          </div>
        )}
      </Field>

      {/* 元信息表单 */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <Field label="负责人">
          <Select
            value={task.assigneeId ?? ""}
            disabled={!isOwner}
            onChange={(e) =>
              isOwner && assignTask(task.taskId, e.target.value || null)
            }
          >
            <option value="">未指派</option>
            {teamMembers.map((m) => (
              <option key={m.memberId} value={m.memberId}>
                {m.nickname}
              </option>
            ))}
          </Select>
          {assignee ? (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Avatar char={assignee.avatarChar} size="xs" />
              <span className="text-[11px] text-muted">{assignee.nickname}</span>
            </div>
          ) : null}
        </Field>

        <Field label="截止日期">
          <input
            type="date"
            value={task.dueDate ?? ""}
            min={todayISO()}
            disabled={!canEdit}
            onChange={(e) =>
              canEdit &&
              updateTask(task.taskId, { dueDate: e.target.value || null })
            }
            className="w-full bg-bg-soft border border-white/[0.10] px-3 h-9 text-[13px] rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <div className="flex items-center gap-1.5 mt-1.5">
            <Calendar size={11} className="text-muted" />
            <span
              className={`text-[11px] font-mono ${
                due.tone === "danger"
                  ? "text-accent-soft font-semibold"
                  : due.tone === "warn"
                    ? "text-accent-soft"
                    : due.tone === "done"
                      ? "text-success"
                      : "text-muted"
              }`}
            >
              {due.label}
            </span>
          </div>
        </Field>

        <Field label="优先级">
          <Select
            value={task.priority}
            disabled={!canEdit}
            onChange={(e) =>
              canEdit &&
              updateTask(task.taskId, { priority: e.target.value as Priority })
            }
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="状态">
          <Select
            value={task.status}
            disabled={!canEdit}
            onChange={(e) =>
              canEdit &&
              setTaskStatus(task.taskId, e.target.value as TaskStatus)
            }
          >
            {STATUS_FLOW.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
      </section>

      {/* 标签 */}
      <Field label="标签" className="mb-5">
        <div className="flex flex-wrap items-center gap-1.5">
          {task.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 h-6 px-2 text-[11px] bg-accent/15 text-accent-soft border border-accent/30 rounded-lg"
            >
              #{t}
              {canEdit ? (
                <button
                  onClick={() => removeTag(t)}
                  className="hover:text-accent-soft"
                  aria-label={`删除标签 ${t}`}
                >
                  ×
                </button>
              ) : null}
            </span>
          ))}
          {canEdit ? (
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="输入回车添加"
              className="h-6 w-28 px-2 text-[11px] bg-white/[0.04] border border-white/[0.08] rounded-lg focus:outline-none focus:border-accent"
            />
          ) : null}
          {task.tags.length === 0 && !canEdit ? (
            <span className="text-[12px] text-dim italic">无标签</span>
          ) : null}
        </div>
      </Field>

      {/* 备注 */}
      <section className="mb-5">
        <div className="flex items-center gap-1.5 mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
          <MessageCircle size={12} /> 备注 ({taskNotes.length})
        </div>
        {taskNotes.length === 0 ? (
          <div className="text-[12px] text-dim italic py-2">
            还没有备注，留下第一条留言吧。
          </div>
        ) : (
          <ul className="space-y-2 mb-3">
            {taskNotes.map((n) => {
              const author = members[n.authorId];
              return (
                <li key={n.noteId} className="flex items-start gap-2">
                  <Avatar
                    char={author?.avatarChar ?? "?"}
                    size="sm"
                    title={author?.nickname}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[12px] font-medium text-ink">
                        {author?.nickname ?? "匿名"}
                      </span>
                      <span className="mono-meta">{relativeTime(n.timestamp)}</span>
                    </div>
                    <p className="text-[13px] text-ink/85 whitespace-pre-wrap break-words mt-0.5">
                      {n.content}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {currentMember ? (
          <div className="flex items-end gap-2">
            <TextArea
              rows={2}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  submitNote();
                }
              }}
              placeholder="说点什么… ⌘/Ctrl + Enter 发送"
            />
            <Button
              variant="primary"
              size="md"
              onClick={submitNote}
              disabled={!noteDraft.trim()}
              leadingIcon={<Send size={13} />}
            >
              发送
            </Button>
          </div>
        ) : null}
      </section>

      {/* 活动时间线 */}
      <section>
        <div className="flex items-center gap-1.5 mb-3 text-[11px] font-medium uppercase tracking-wider text-muted">
          <Clock size={12} /> 活动记录 ({taskActivities.length})
        </div>
        {taskActivities.length === 0 ? (
          <div className="text-[12px] text-dim italic">尚无活动记录</div>
        ) : (
          <ol className="relative pl-4 border-l border-white/[0.08]">
            {taskActivities.map((a) => {
              const actor = members[a.actorId];
              let detail = "";
              try {
                const p = JSON.parse(a.payload);
                if (a.type === "status_changed") {
                  detail = `${STATUS_LABEL[p.from as TaskStatus] ?? p.from} → ${STATUS_LABEL[p.to as TaskStatus] ?? p.to}`;
                } else if (a.type === "assigned") {
                  detail = p.to ? `→ ${members[p.to]?.nickname ?? "未知"}` : "→ 取消指派";
                } else if (a.type === "created") {
                  detail = `「${p.title}」`;
                } else if (a.type === "note_added") {
                  detail = p.content?.slice(0, 40) ?? "";
                } else if (a.type === "edited") {
                  detail = Object.keys(p).join(", ");
                }
              } catch {
                /* ignore */
              }
              return (
                <li key={a.activityId} className="relative pb-3 last:pb-0">
                  <span className="absolute -left-[1.125rem] top-1 h-2 w-2 rounded-full bg-accent/60 ring-2 ring-bg-soft" />
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-[12px] font-medium text-ink">
                      {actor?.nickname ?? "匿名"}
                    </span>
                    <span className="text-[12px] text-muted">
                      {ACTIVITY_LABEL[a.type] ?? a.type}
                    </span>
                    {detail ? (
                      <span className="text-[11px] text-muted italic">
                        {detail}
                      </span>
                    ) : null}
                  </div>
                  <div className="mono-meta mt-0.5">
                    {relativeTime(a.timestamp)}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* 元信息 foot */}
      <div className="mt-6 pt-4 border-t border-white/[0.06] grid grid-cols-2 gap-3 mono-meta">
        <div className="flex items-center gap-1.5">
          <User size={11} /> 创建者 {members[activities[Object.keys(activities)[0] ?? ""]?.actorId ?? ""]?.nickname ?? "—"}
        </div>
        <div className="flex items-center gap-1.5">
          <Flag size={11} /> 更新于 {relativeTime(task.updatedAt)}
        </div>
      </div>
    </Drawer>
  );
}
