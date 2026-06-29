import { useMemo, useState } from "react";
import {
  Check,
  Download,
  Pencil,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Avatar } from "@/components/ui/Avatar";
import { Button, IconButton } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { CountBadge } from "@/components/ui/Badge";
import {
  useTodoStore,
  selectCurrentTeam,
  selectCurrentMember,
} from "@/store/todoStore";
import { useUIStore } from "@/store/uiStore";
import { collectMembers, computeStats } from "@/features/stats";
import { relativeTime } from "@/lib/date";

export function TeamSettingDrawer() {
  const open = useUIStore((s) => s.teamDrawerOpen);
  const setOpen = useUIStore((s) => s.setTeamDrawer);

  const team = useTodoStore(selectCurrentTeam);
  const member = useTodoStore(selectCurrentMember);
  const members = useTodoStore((s) => s.members);
  const tasks = useTodoStore((s) => s.tasks);
  const renameTeam = useTodoStore((s) => s.renameTeam);
  const updateNickname = useTodoStore((s) => s.updateNickname);
  const exportJSON = useTodoStore((s) => s.exportJSON);
  const removeMember = useTodoStore((s) => s.removeMember);

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [editingTeam, setEditingTeam] = useState(false);
  const [teamNameDraft, setTeamNameDraft] = useState("");
  const [editingNick, setEditingNick] = useState(false);
  const [nickDraft, setNickDraft] = useState("");
  const [exporting, setExporting] = useState(false);

  const teamMembers = useMemo(
    () => (team ? collectMembers(members, team.teamId) : []),
    [members, team],
  );
  const stats = useMemo(
    () => (team ? computeStats(tasks, team.teamId) : null),
    [tasks, team],
  );

  if (!team || !member) return null;

  async function saveTeamName() {
    const v = teamNameDraft.trim();
    if (v && v !== team!.teamName) {
      try {
        await renameTeam(team!.teamId, v);
      } catch {
        /* ignore */
      }
    }
    setEditingTeam(false);
  }

  async function saveNick() {
    const v = nickDraft.trim();
    if (v) {
      try {
        await updateNickname(v);
      } catch {
        /* ignore */
      }
    }
    setEditingNick(false);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const json = await exportJSON();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `todo-${team!.inviteCode}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function handleRemoveMember(memberId: string, nickname: string) {
    if (busy) return;
    const ok = window.confirm(
      `确定要移除队员「${nickname}」吗？\n\n该操作会：\n• 解除其负责任务的指派（任务保留，变为未指派）\n• 删除与该成员的所有私信记录\n• 将该成员从团队中移除\n\n此操作不可撤销。`,
    );
    if (!ok) return;
    try {
      setBusy(true);
      await removeMember(memberId);
      setRemovingId(null);
    } catch (e: any) {
      alert(e.message || "移除失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={() => setOpen(false)}
      title={
        editingTeam ? (
          <input
            autoFocus
            value={teamNameDraft}
            onChange={(e) => setTeamNameDraft(e.target.value)}
            onBlur={saveTeamName}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTeamName();
              if (e.key === "Escape") setEditingTeam(false);
            }}
            className="w-full bg-transparent border-b border-mint focus:outline-none"
          />
        ) : (
          <div className="flex items-center gap-2">
            <span>{team.teamName}</span>
            {team.ownerId === member.memberId ? (
              <button
                onClick={() => {
                  setTeamNameDraft(team.teamName);
                  setEditingTeam(true);
                }}
                className="text-muted hover:text-ink"
                aria-label="重命名团队"
              >
                <Pencil size={13} />
              </button>
            ) : null}
          </div>
        )
      }
      subtitle={`邀请码 ${team.inviteCode} · 创建于 ${relativeTime(team.createdAt)}`}
      widthClass="w-[440px] max-w-[92vw]"
    >
      {/* 我的信息 */}
      <section className="mb-6 biz-card rounded-lg p-4">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted mb-3">
          我的信息
        </div>
        <div className="flex items-center gap-3">
          <Avatar char={member.avatarChar} size="lg" />
          <div className="flex-1 min-w-0">
            {editingNick ? (
              <div className="flex items-center gap-2">
                <TextInput
                  autoFocus
                  value={nickDraft}
                  onChange={(e) => setNickDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveNick();
                    if (e.key === "Escape") setEditingNick(false);
                  }}
                  className="h-8"
                  maxLength={20}
                />
                <IconButton onClick={saveNick} aria-label="保存昵称">
                  <Check size={16} />
                </IconButton>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-sans text-[18px] text-ink">
                  {member.nickname}
                </span>
                <button
                  onClick={() => {
                    setNickDraft(member.nickname);
                    setEditingNick(true);
                  }}
                  className="text-muted hover:text-ink"
                  aria-label="修改昵称"
                >
                  <Pencil size={12} />
                </button>
              </div>
            )}
            <div className="mono-meta mt-0.5">
              身份：{team.ownerId === member.memberId ? "团队所有者" : "成员"}
            </div>
          </div>
        </div>
      </section>

      {/* 团队成员 */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted flex items-center gap-1.5">
            <Users size={12} /> 团队成员
          </h3>
          <CountBadge tone="neutral">{teamMembers.length}</CountBadge>
        </div>
        <ul className="space-y-1">
          {teamMembers.map((m) => {
            const isOwner = team.ownerId === m.memberId;
            const isMe = m.memberId === member.memberId;
            const canRemove = team.ownerId === member.memberId && !isOwner;
            const isRemovingThis = removingId === m.memberId;
            return (
              <li
                key={m.memberId}
                className="flex items-center justify-between gap-2 px-2 py-1.5 hover:bg-bg-soft rounded-lg"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar char={m.avatarChar} size="sm" />
                  <span className="text-[13px] text-ink truncate">
                    {m.nickname}
                  </span>
                  {isOwner ? (
                    <span className="flex items-center gap-0.5 mono-meta text-[#4a7a68]">
                      <Shield size={10} /> 队长
                    </span>
                  ) : null}
                  {isMe ? (
                    <span className="mono-meta text-muted">（我）</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="mono-meta">{relativeTime(m.joinedAt)}</span>
                  <CountBadge tone="neutral">
                    {stats?.byAssignee[m.memberId] ?? 0}
                  </CountBadge>
                  {canRemove ? (
                    <IconButton
                      onClick={() => setRemovingId(m.memberId)}
                      aria-label="移除队员"
                      title="移除队员"
                      size="sm"
                      className="h-7 w-7 text-muted hover:text-[#a85c4a] hover:bg-peach-soft hover:border-peach"
                    >
                      <Trash2 size={12} />
                    </IconButton>
                  ) : null}
                </div>
                {isRemovingThis ? (
                  <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm grid place-items-center p-4 animate-fade-in">
                    <div className="bg-surface rounded-lg border border-line shadow-lift p-5 max-w-sm w-full animate-pop">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="h-8 w-8 grid place-items-center rounded-full bg-peach-soft text-[#a85c4a]">
                          <Trash2 size={16} />
                        </span>
                        <h4 className="font-sans text-[16px] font-semibold text-ink">
                          移除队员
                        </h4>
                      </div>
                      <p className="text-[13px] text-ink-2 leading-relaxed mb-4">
                        确定要移除「<strong className="text-ink">{m.nickname}</strong>」吗？
                        该操作会：
                      </p>
                      <ul className="text-[12px] text-muted leading-relaxed mb-4 space-y-1 pl-4 list-disc">
                        <li>解除其负责任务的指派（任务保留为未指派）</li>
                        <li>删除与该成员的所有私信记录</li>
                        <li>将该成员从团队中移除</li>
                      </ul>
                      <p className="text-[11px] text-[#a85c4a] mb-4">此操作不可撤销。</p>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRemovingId(null)}
                          disabled={busy}
                        >
                          取消
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRemoveMember(m.memberId, m.nickname)}
                          disabled={busy}
                          leadingIcon={<Trash2 size={12} />}
                        >
                          {busy ? "移除中…" : "确定移除"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        {team.ownerId === member.memberId ? (
          <p className="mono-meta mt-2 leading-relaxed">
            作为队长，你可以移除非队长的成员。被移除成员的任务会变为未指派。
          </p>
        ) : null}
      </section>

      {/* 数据管理 */}
      <section className="mb-6">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted mb-3">
          数据管理
        </h3>
        <Button
          variant="secondary"
          size="md"
          onClick={handleExport}
          disabled={exporting}
          leadingIcon={<Download size={14} />}
          className="w-full"
        >
          {exporting ? "导出中…" : "导出团队数据 JSON"}
        </Button>
        <p className="mono-meta mt-2 leading-relaxed">
          数据实时存储在后端服务器，所有成员看到同一份。
          导出可备份当前团队的全部任务、备注、活动与私信。
        </p>
      </section>
    </Drawer>
  );
}
