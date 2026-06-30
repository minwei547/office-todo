import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronUp, Image as ImageIcon, Loader2, MessageSquare, Search, Send, X } from "lucide-react";
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
  const conversationMeta = useTodoStore((s) => s.conversationMeta);
  const sendDM = useTodoStore((s) => s.sendDM);
  const sendImageDM = useTodoStore((s) => s.sendImageDM);
  const markRead = useTodoStore((s) => s.markConversationRead);
  const refreshConversation = useTodoStore((s) => s.refreshConversation);
  const loadOlderMessages = useTodoStore((s) => s.loadOlderMessages);

  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [sendingImage, setSendingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [kbInset, setKbInset] = useState(0); // 键盘高度（px）
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputBarRef = useRef<HTMLDivElement>(null);

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

  // 当前会话的分页元信息
  const meta = peerId ? conversationMeta[peerId] : null;
  const hasMore = !!meta?.hasMore;
  const loadingMore = !!meta?.loadingMore;

  // 进入会话时拉取最新一页 + 滚动到底部 + 标记已读
  useEffect(() => {
    if (peerId) {
      // 拉取最新一页历史消息（首次或切换 peer 时）
      refreshConversation(peerId).catch(() => {});
      markRead(peerId);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId]);

  // 新消息到达时滚到底部（仅在已贴近底部时）
  useEffect(() => {
    if (!peerId) return;
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 120) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [peerId, conversationMessages.length]);

  // 加载更早的历史消息，保持视觉位置不变
  const handleLoadOlder = useCallback(async () => {
    if (!peerId || !hasMore || loadingMore) return;
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const prevTop = el?.scrollTop ?? 0;
    try {
      await loadOlderMessages(peerId);
      // 恢复滚动位置：保持用户看到的那条消息仍在原位置
      requestAnimationFrame(() => {
        if (!el) return;
        const newHeight = el.scrollHeight;
        el.scrollTop = prevTop + (newHeight - prevHeight);
      });
    } catch {
      /* ignore */
    }
  }, [peerId, hasMore, loadingMore, loadOlderMessages]);

  // ESC 关闭图片预览
  useEffect(() => {
    if (!previewImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewImage(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewImage]);

  // 移动端键盘遮挡处理：用 visualViewport 监听键盘高度，
  // 给输入条动态加 bottom padding 让它始终可见
  useEffect(() => {
    if (!open || !peerId) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      // 键盘高度 = 视口高度差
      const kb = window.innerHeight - vv.height - vv.offsetTop;
      setKbInset(kb > 50 ? kb : 0);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [open, peerId]);

  // textarea 聚焦时滚入视口（避免被键盘挡住）
  const scrollToBottomOnFocus = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

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

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !peerId) return;
    try {
      setSendingImage(true);
      await sendImageDM(peerId, file);
    } catch (err: any) {
      alert(err.message || "图片发送失败");
    } finally {
      setSendingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // 粘贴截图：从剪贴板取图片直接发送
  async function handlePaste(e: React.ClipboardEvent<HTMLElement>) {
    if (!peerId) return;
    const items = e.clipboardData?.items;
    if (!items || items.length === 0) return;
    // 用索引访问 DataTransferItemList，避免 for...of 在部分浏览器不可迭代
    let imageFile: File | null = null;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file" && item.type.startsWith("image/")) {
        imageFile = item.getAsFile();
        if (imageFile) break;
      }
    }
    if (!imageFile) return; // 没有图片，走默认文本粘贴
    e.preventDefault(); // 阻止默认粘贴（避免把图片当文本插入）
    try {
      setSendingImage(true);
      await sendImageDM(peerId, imageFile);
    } catch (err: any) {
      alert(err.message || "图片发送失败");
    } finally {
      setSendingImage(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <button
        aria-label="关闭"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-[rgba(220,220,230,0.4)] backdrop-blur-[4px] animate-[fade-up_200ms_ease-out]"
      />
      <div
        onPaste={peer ? handlePaste : undefined}
        className="absolute right-0 top-0 h-full w-[460px] max-w-[94vw] bg-surface/95 border-l border-line shadow-lift flex flex-col animate-slide-in backdrop-blur-xl"
      >
        {/* 头部 */}
        <header className="flex items-center justify-between gap-3 px-5 h-14 border-b border-line">
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
                <span className="font-sans text-[16px] text-ink truncate">
                  {peer.nickname}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-[#4a7a68]" />
                <h2 className="font-sans text-[18px] text-ink">私信</h2>
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
                <div className="text-center text-[13px] text-dim italic py-12">
                  还没有对话，发送第一条消息吧。
                </div>
              ) : (
                <>
                  {/* 加载更早消息 */}
                  {hasMore ? (
                    <div className="flex justify-center py-1">
                      <button
                        onClick={handleLoadOlder}
                        disabled={loadingMore}
                        className="inline-flex items-center gap-1.5 h-7 px-3 text-[12px] text-[#4a7a68] bg-mint-soft border border-mint rounded-full hover:bg-mint/40 transition-colors disabled:opacity-60"
                      >
                        {loadingMore ? (
                          <>
                            <Loader2 size={12} className="animate-spin" /> 加载中…
                          </>
                        ) : (
                          <>
                            <ChevronUp size={12} /> 加载更早消息
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-[10px] text-dim py-1">
                      — 已是全部历史消息 —
                    </div>
                  )}
                  {conversationMessages.map((m) => {
                  const mine = m.senderId === me?.memberId;
                  const sender = members[m.senderId];
                  const isImage = m.kind === "image";
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
                          "max-w-[78%] rounded-lg border overflow-hidden",
                          isImage ? "p-1" : "px-3 py-2",
                          mine
                            ? "bg-mint-gradient text-[#2a5a4a] border-mint shadow-md"
                            : "bg-bg-soft text-ink border-line",
                        )}
                      >
                        {isImage ? (
                          <button
                            onClick={() => setPreviewImage(m.content)}
                            className="block"
                          >
                            <img
                              src={m.content}
                              alt="图片消息"
                              className="max-w-[240px] max-h-[240px] rounded-md object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                              loading="lazy"
                            />
                          </button>
                        ) : (
                          <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">
                            {m.content}
                          </p>
                        )}
                        <div
                          className={cn(
                            "mt-1 text-[10px] font-mono",
                            mine ? "text-muted" : "text-muted",
                            isImage ? "px-2 pb-1" : "",
                          )}
                        >
                          {relativeTime(m.timestamp)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                </>
              )}
              {sendingImage ? (
                <div className="flex items-end gap-2 flex-row-reverse animate-fade-up">
                  <Avatar char={me?.avatarChar ?? "?"} size="xs" />
                  <div className="px-3 py-2 bg-bg-soft border border-line rounded-lg text-[12px] text-muted">
                    正在发送图片…
                  </div>
                </div>
              ) : null}
            </div>
            {/* 输入条 */}
            <div
              ref={inputBarRef}
              className="px-4 py-3 border-t border-line bg-bg-soft transition-[padding] duration-100"
              style={{ paddingBottom: `${Math.max(kbInset, 12)}px` }}
            >
              <div className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <IconButton
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="发送图片"
                  title="发送图片（≤10MB），也可直接粘贴截图"
                  className="h-9 w-9 bg-surface border-line text-[#4a7a68] hover:border-mint hover:bg-mint-soft"
                >
                  <ImageIcon size={15} />
                </IconButton>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onPaste={handlePaste}
                  onFocus={scrollToBottomOnFocus}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  rows={1}
                  placeholder="输入消息，或直接粘贴截图发送 · 回车发送，Shift+回车换行"
                  className="flex-1 bg-bg-soft border border-line px-3 py-2 text-[13px] text-ink placeholder:text-muted/70 resize-none rounded-lg focus:outline-none focus:border-mint focus:ring-1 focus:ring-mint/50 max-h-32"
                />
                <IconButton
                  onClick={submit}
                  aria-label="发送"
                  className="h-9 w-9 bg-mint-gradient text-white hover:shadow-md border-mint"
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
              <section className="px-5 py-4 border-b border-line">
                <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted mb-2">
                  最近会话
                </h3>
                <ul className="space-y-0.5">
                  {conversations.map((c) => {
                    const peerMember = members[c.peerId];
                    if (!peerMember) return null;
                    const isImage = c.lastMessage.kind === "image";
                    return (
                      <li key={c.peerId}>
                        <button
                          onClick={() => setPeer(c.peerId)}
                          className="w-full flex items-center gap-3 px-2 py-2 hover:bg-bg-soft rounded-lg text-left"
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
                              {isImage ? "[图片]" : c.lastMessage.content}
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
                  className="w-full h-8 pl-7 pr-3 text-[12px] bg-bg-soft border border-line rounded-lg focus:outline-none focus:border-mint text-ink placeholder:text-muted/70"
                />
              </div>
              {filtered.length === 0 ? (
                <div className="text-[12px] text-dim italic py-2">
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
                          className="w-full flex items-center gap-3 px-2 py-2 hover:bg-bg-soft rounded-lg text-left"
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

      {/* 图片预览灯箱 */}
      {previewImage ? (
        <div
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm grid place-items-center p-8 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setPreviewImage(null)}
            aria-label="关闭预览"
          >
            <X size={24} />
          </button>
          <img
            src={previewImage}
            alt="预览"
            className="max-w-full max-h-full object-contain rounded-lg shadow-lift animate-pop"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
