import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MessageSquare, Search, Send, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/Button";
import { CountBadge } from "@/components/ui/Badge";
import { useTodoStore, selectCurrentMember } from "@/store/todoStore";
import { useUIStore } from "@/store/uiStore";
import { collectMembers } from "@/features/stats";
import { relativeTime } from "@/lib/date";
import { cn } from "@/lib/utils";

export function DMDrawer() {
  const open = useUIStore((s) => s.dmDrawerOpen);
  const setOpen = useUIStore((s) => s.setDMDrawer);
  const peerId = useUIStore((s) => s.dmPeerId);
  const setPeer = useUIStore((s) => s.setDMPeer);

  const me = useTodoStore(selectCurrentMember);
  const members = useTodoStore((s) => s.members);
  const messages = useTodoStore((s) => s.messages);
  const sendDM = useTodoStore((s) => s.sendDM);
  const markRead = useTodoStore((s) => s.markConversationRead);

  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const teamId = me?.teamId;
  const teamMembers = useMemo(
    () => (teamId ? collectMembers(members, teamId) : []),
    [members, teamId],
  );

  const peer = peerId ? members[peerId] : null;

  // 派生：当前 peer 的会话消息（升序）
  const conversationMessages = useMemo(() => {
    if (!me || !peerId) return [];
    const convId = [me.memberId, peerId].sort().join(":");
    return Object.values(messages)
      .filter((m) => m.conversationId === convId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [me, peerId, messages]);

  // 派生：会话列表
  const conversations = useMemo(() => {
    if (!me) return [];
    const list: {
      peerId: string;
      lastMessage: (typeof messages)[string];
      unread: number;
    }[] = [];
    for (const m of Object.values(messages)) {
      if (m.teamId !== me.teamId) continue;
      if (m.senderId !== me.memberId && m.receiverId !== me.memberId) continue;
      const pid = m.senderId === me.memberId ? m.receiverId : m.senderId;
      const existing = list.find((c) => c.peerId === pid);
      if (!existing) {
        list.push({ peerId: pid, lastMessage: m, unread: 0 });
      } else if (m.timestamp > existing.lastMessage.timestamp) {
        existing.lastMessage = m;
      }
    }
    for (const item of list) {
      const convId = [me.memberId, item.peerId].sort().join(":");
      item.unread = Object.values(messages).filter(
        (m) =>
          m.conversationId === convId &&
          m.receiverId === me.memberId &&
          !m.read,
      ).length;
    }
    return list.sort(
      (a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp,
    );
  }, [me, messages]);

  // 进入会话时滚动到底部 + 标记已读
  useEffect(() => {
    if (peerId) {
      markRead(peerId);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      });
    }
  }, [peerId, conversationMessages.length, markRead]);

  if (!open) return null;

  // 过滤可发起私信的成员（排除自己）
  const candidates = teamMembers.filter((m) => m.memberId !== me?.memberId);
  const filtered = search.trim()
    ? candidates.filter((m) => m.nickname.includes(search.trim()))
    : candidates;

  // 已有会话的 peer 集合
  const conversatedPeerIds = new Set(conversations.map((c) => c.peerId));

  function submit() {
    const text = draft.trim();
    if (!text || !peerId) return;
    sendDM(peerId, text);
    setDraft("");
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <button
        aria-label="关闭"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-ink/30 backdrop-blur-[1px] animate-[fade-up_200ms_ease-out]"
      />
      <div className="absolute right-0 top-0 h-full w-[460px] max-w-[94vw] bg-paper border-l border-ink/15 shadow-lift flex flex-col animate-slide-in">
        {/* 头部 */}
        <header className="flex items-center justify-between gap-3 px-5 h-14 border-b border-ink/10">
          {peer ? (
            <>
              <button
                onClick={() => setPeer(null)}
                className="text-muted hover:text-ink flex items-center gap-1 text-[12px]"
              >
                <ArrowLeft size={14} /> 返回
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <Avatar char={peer.avatarChar} size="sm" />
                <span className="font-display text-[16px] truncate">
                  {peer.nickname}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-accent" />
                <h2 className="font-display text-[18px]">私信</h2>
              </div>
              <IconButton onClick={() => setOpen(false)} aria-label="关闭">
                <X size={18} />
              </IconButton>
            </>
          )}
        </header>

        {peer ? (
          // ── 对话视图 ──
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {conversationMessages.length === 0 ? (
                <div className="text-center text-[13px] text-muted/70 italic py-12">
                  还没有对话，发送第一条消息吧。
                </div>
              ) : (
                conversationMessages.map((m) => {
                  const mine = m.senderId === me?.memberId;
                  const sender = members[m.senderId];
                  return (
                    <div
                      key={m.messageId}
                      className={cn(
                        "flex items-end gap-2 animate-fade-up",
                        mine ? "flex-row-reverse" : "",
                      )}
                    >
                      <Avatar
                        char={sender?.avatarChar ?? "?"}
                        size="xs"
                        title={sender?.nickname}
                      />
                      <div
                        className={cn(
                          "max-w-[78%] px-3 py-2 text-[13px] leading-relaxed rounded-[4px] border",
                          mine
                            ? "bg-accent text-paper border-accent"
                            : "bg-chip/60 text-ink border-ink/15",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">
                          {m.content}
                        </p>
                        <div
                          className={cn(
                            "mt-1 text-[10px] font-mono",
                            mine ? "text-paper/70" : "text-muted",
                          )}
                        >
                          {relativeTime(m.timestamp)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {/* 输入条 */}
            <div className="px-4 py-3 border-t border-ink/10 bg-chip/30">
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  rows={1}
                  placeholder="输入消息，回车发送，Shift+回车换行"
                  className="flex-1 bg-paper border border-ink/20 px-3 py-2 text-[13px] resize-none rounded-[2px] focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 max-h-32"
                />
                <IconButton
                  onClick={submit}
                  aria-label="发送"
                  className="h-9 w-9 bg-accent text-paper hover:bg-accent/90 border-accent"
                >
                  <Send size={15} />
                </IconButton>
              </div>
            </div>
          </>
        ) : (
          // ── 会话列表 + 成员列表 ──
          <div className="flex-1 overflow-y-auto">
            {/* 已有会话 */}
            {conversations.length > 0 ? (
              <section className="px-5 py-4 border-b border-ink/10">
                <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted mb-2">
                  最近会话
                </h3>
                <ul className="space-y-0.5">
                  {conversations.map((c) => {
                    const peerMember = members[c.peerId];
                    if (!peerMember) return null;
                    return (
                      <li key={c.peerId}>
                        <button
                          onClick={() => setPeer(c.peerId)}
                          className="w-full flex items-center gap-3 px-2 py-2 hover:bg-chip/40 rounded-[2px] text-left"
                        >
                          <Avatar
                            char={peerMember.avatarChar}
                            size="md"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[13px] font-medium text-ink truncate">
                                {peerMember.nickname}
                              </span>
                              <span className="mono-meta shrink-0">
                                {relativeTime(c.lastMessage.timestamp)}
                              </span>
                            </div>
                            <p className="text-[12px] text-muted truncate">
                              {c.lastMessage.senderId === me?.memberId ? "你：" : ""}
                              {c.lastMessage.content}
                            </p>
                          </div>
                          {c.unread > 0 ? (
                            <CountBadge tone="accent">{c.unread}</CountBadge>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {/* 全部成员（可发起私信） */}
            <section className="px-5 py-4">
              <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted mb-2">
                团队成员
              </h3>
              <div className="relative mb-2">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索成员…"
                  className="w-full h-8 pl-7 pr-3 text-[12px] bg-chip/40 border border-ink/15 rounded-[2px] focus:outline-none focus:border-accent"
                />
              </div>
              {filtered.length === 0 ? (
                <div className="text-[12px] text-muted/70 italic py-2">
                  没有匹配的成员
                </div>
              ) : (
                <ul className="space-y-0.5">
                  {filtered.map((m) => {
                    const hasConv = conversatedPeerIds.has(m.memberId);
                    const conv = conversations.find(
                      (c) => c.peerId === m.memberId,
                    );
                    return (
                      <li key={m.memberId}>
                        <button
                          onClick={() => setPeer(m.memberId)}
                          className="w-full flex items-center gap-3 px-2 py-2 hover:bg-chip/40 rounded-[2px] text-left"
                        >
                          <Avatar char={m.avatarChar} size="md" />
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-ink truncate">
                              {m.nickname}
                            </div>
                            <div className="mono-meta">
                              {hasConv
                                ? `${relativeTime(conv!.lastMessage.timestamp)} · 最近联系`
                                : "点击发起对话"}
                            </div>
                          </div>
                          {conv && conv.unread > 0 ? (
                            <CountBadge tone="accent">
                              {conv.unread}
                            </CountBadge>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
