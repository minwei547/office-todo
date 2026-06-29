import { useState } from "react";
import { Calendar, Flag, Plus, Tag, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useTodoStore, selectCurrentTeam } from "@/store/todoStore";
import type { Priority, TaskStatus } from "@/types";
import { PRIORITY_LABEL } from "@/types";
import { todayISO } from "@/lib/date";

interface DraftState {
  priority: Priority;
  dueDate: string;
  assigneeId: string | null;
  tags: string[];
  status: TaskStatus;
}

const DEFAULT_DRAFT: DraftState = {
  priority: "medium",
  dueDate: "",
  assigneeId: null,
  tags: [],
  status: "todo",
};

export function QuickAddBar() {
  const team = useTodoStore(selectCurrentTeam);
  const members = useTodoStore((s) => s.members);
  const addTask = useTodoStore((s) => s.addTask);

  const [title, setTitle] = useState("");
  const [draft, setDraft] = useState<DraftState>(DEFAULT_DRAFT);
  const [expanded, setExpanded] = useState(false);
  const [tagInput, setTagInput] = useState("");

  if (!team) return null;

  const teamMembers = Object.values(members).filter(
    (m) => m.teamId === team.teamId,
  );

  async function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    await addTask({
      title: trimmed,
      priority: draft.priority,
      dueDate: draft.dueDate || null,
      assigneeId: draft.assigneeId,
      tags: draft.tags,
      description: "",
    });
    setTitle("");
    setDraft(DEFAULT_DRAFT);
    setExpanded(false);
    setTagInput("");
    // WS 推送会自动添加新任务到列表
  }

  function addTag() {
    const t = tagInput.trim().replace(/^#/, "");
    if (!t || draft.tags.includes(t)) {
      setTagInput("");
      return;
    }
    setDraft((d) => ({ ...d, tags: [...d.tags, t] }));
    setTagInput("");
  }

  return (
    <div className="biz-card rounded-lg">
      {/* 主输入 */}
      <div className="flex items-center gap-2 px-3.5 h-12">
        <span className="h-5 w-5 shrink-0 grid place-items-center text-blue-600">
          <Plus size={18} />
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
            if (e.key === "Escape") {
              setExpanded(false);
              setTitle("");
            }
          }}
          placeholder="记录一件待办，回车快速创建…"
          className="flex-1 bg-transparent text-[14px] text-slate-900 placeholder:text-muted/60 focus:outline-none"
        />
        <Button
          variant="primary"
          size="sm"
          onClick={submit}
          disabled={!title.trim()}
        >
          添加
        </Button>
      </div>

      {/* 展开态：附加属性 */}
      {expanded ? (
        <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-300/10 flex flex-wrap items-center gap-2 animate-fade-up">
          {/* 优先级 */}
          <div className="flex items-center gap-1.5">
            <Flag size={12} className="text-muted" />
            <select
              value={draft.priority}
              onChange={(e) =>
                setDraft((d) => ({ ...d, priority: e.target.value as Priority }))
              }
              className="h-7 px-2 text-[12px] bg-chip/60 border border-slate-300/15 rounded-lg focus:outline-none focus:border-blue-600"
            >
              {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </div>

          {/* 截止日 */}
          <div className="flex items-center gap-1.5">
            <Calendar size={12} className="text-muted" />
            <input
              type="date"
              value={draft.dueDate}
              min={todayISO()}
              onChange={(e) =>
                setDraft((d) => ({ ...d, dueDate: e.target.value }))
              }
              className="h-7 px-2 text-[12px] bg-chip/60 border border-slate-300/15 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* 负责人 */}
          <div className="flex items-center gap-1.5">
            <User size={12} className="text-muted" />
            <select
              value={draft.assigneeId ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  assigneeId: e.target.value || null,
                }))
              }
              className="h-7 px-2 text-[12px] bg-chip/60 border border-slate-300/15 rounded-lg focus:outline-none focus:border-blue-600 max-w-[120px]"
            >
              <option value="">未指派</option>
              {teamMembers.map((m) => (
                <option key={m.memberId} value={m.memberId}>
                  {m.nickname}
                </option>
              ))}
            </select>
          </div>

          {/* 标签 */}
          <div className="flex items-center gap-1.5">
            <Tag size={12} className="text-muted" />
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="标签"
              className="h-7 w-20 px-2 text-[12px] bg-chip/60 border border-slate-300/15 rounded-lg focus:outline-none focus:border-blue-600"
            />
            {draft.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center h-6 px-1.5 text-[11px] bg-ink text-white rounded-lg"
              >
                #{t}
              </span>
            ))}
          </div>

          {/* 已选负责人头像 */}
          {draft.assigneeId ? (
            <div className="flex items-center gap-1 ml-auto">
              {(() => {
                const m = members[draft.assigneeId];
                return m ? (
                  <>
                    <Avatar char={m.avatarChar} size="xs" />
                    <span className="text-[11px] text-muted">{m.nickname}</span>
                  </>
                ) : null;
              })()}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
