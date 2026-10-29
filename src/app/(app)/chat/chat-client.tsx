"use client";

import {
  FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { CHAT_REACTIONS, CHAT_STICKERS } from "@/lib/constants";
import { formatLastSeen, isOnline } from "@/lib/chat-presence";
import type { AggregatedReaction, MessageDto } from "@/lib/chat-messages";

type Partner = {
  id: string;
  displayName: string;
  avatarPath: string | null;
  genderRole: string;
  lastSeenAt: string | null;
};

type Person = {
  id: string;
  displayName: string;
  avatarPath: string | null;
};

type MenuState = { messageId: string; x: number; y: number } | null;

const GROUP_GAP_MS = 5 * 60_000;
const LONG_PRESS_MS = 420;

function Avatar({
  name,
  src,
  size = "md",
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const cls = `chat-avatar chat-avatar--${size}`;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={cls} src={src} alt="" />;
  }
  return (
    <span className={`${cls} chat-avatar--fallback`} aria-hidden>
      {(name || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function formatDayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startToday.getTime() - startMsg.getTime()) / 86_400_000);
  if (diffDays === 0) return "Сегодня";
  if (diffDays === 1) return "Вчера";
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

function sameDay(a: string, b: string) {
  return dayKey(a) === dayKey(b);
}

function isStickerBody(body: string) {
  return body.length <= 8 && /\p{Extended_Pictographic}/u.test(body) && !/\n/.test(body);
}

function ChatSvgIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function StickerIcon() {
  return (
    <ChatSvgIcon>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 10h.01M15.5 10h.01" />
      <path d="M8.2 14.5c1.1 1.4 2.5 2 3.8 2s2.7-.6 3.8-2" />
    </ChatSvgIcon>
  );
}

function SendIcon() {
  return (
    <ChatSvgIcon>
      <path d="M5 12h13" />
      <path d="m13 6 6 6-6 6" />
    </ChatSvgIcon>
  );
}

function ProfileIcon() {
  return (
    <ChatSvgIcon>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19.2c1.4-3 3.5-4.4 6.5-4.4s5.1 1.4 6.5 4.4" />
    </ChatSvgIcon>
  );
}

function CloseIcon() {
  return (
    <ChatSvgIcon>
      <path d="M7 7l10 10M17 7 7 17" />
    </ChatSvgIcon>
  );
}

function SearchIcon() {
  return (
    <ChatSvgIcon>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 3.5 3.5" />
    </ChatSvgIcon>
  );
}

type Row =
  | { kind: "day"; key: string; label: string }
  | {
      kind: "msg";
      key: string;
      message: MessageDto;
      mine: boolean;
      firstInGroup: boolean;
      lastInGroup: boolean;
    };

function buildRows(messages: MessageDto[], me: string | undefined): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const prev = messages[i - 1];
    const next = messages[i + 1];

    if (!prev || !sameDay(prev.createdAt, m.createdAt)) {
      rows.push({ kind: "day", key: `day-${dayKey(m.createdAt)}`, label: formatDayLabel(m.createdAt) });
    }

    const mine = m.authorId === me;
    const closePrev =
      prev &&
      prev.authorId === m.authorId &&
      sameDay(prev.createdAt, m.createdAt) &&
      new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() <= GROUP_GAP_MS;
    const closeNext =
      next &&
      next.authorId === m.authorId &&
      sameDay(next.createdAt, m.createdAt) &&
      new Date(next.createdAt).getTime() - new Date(m.createdAt).getTime() <= GROUP_GAP_MS;

    rows.push({
      kind: "msg",
      key: m.id,
      message: m,
      mine,
      firstInGroup: !closePrev,
      lastInGroup: !closeNext,
    });
  }
  return rows;
}

function mergeById(prev: MessageDto[], incoming: MessageDto[]) {
  const map = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) map.set(m.id, m);
  return [...map.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function ChatClient({ partner }: { partner: Partner | null }) {
  const { data, update } = useSession();
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [pinnedMessageId, setPinnedMessageId] = useState<string | null>(null);
  const [pinnedPreview, setPinnedPreview] = useState<{
    id: string;
    body: string;
    authorName: string;
  } | null>(null);
  const [text, setText] = useState("");
  const [profile, setProfile] = useState<Person | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [stickersOpen, setStickersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchHits, setSearchHits] = useState<MessageDto[]>([]);
  const [searchNote, setSearchNote] = useState("");
  const [profileError, setProfileError] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<MessageDto | null>(null);
  const [quoteText, setQuoteText] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const [partnerSeen, setPartnerSeen] = useState<string | null>(partner?.lastSeenAt ?? null);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const me = data?.user?.id || profile?.id;
  const rows = useMemo(() => buildRows(messages, me), [messages, me]);
  const pinnedFromList = pinnedMessageId
    ? messages.find((m) => m.id === pinnedMessageId)
    : null;
  const pinnedBar =
    pinnedFromList
      ? { id: pinnedFromList.id, body: pinnedFromList.body }
      : pinnedMessageId && pinnedPreview?.id === pinnedMessageId
        ? { id: pinnedPreview.id, body: pinnedPreview.body }
        : null;

  const subtitle = useMemo(() => {
    if (!partner) return "";
    if (partnerTyping) return "печатает…";
    if (isOnline(partnerSeen)) return "в сети";
    return formatLastSeen(partnerSeen, partner.genderRole);
    // tick refreshes relative time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner, partnerSeen, partnerTyping, tick]);

  const scrollToMessage = useCallback((id: string) => {
    const el = logRef.current?.querySelector(`[data-message-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightId(id);
      window.setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 1600);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/messages");
      const json = await res.json();
      if (!cancelled) {
        setMessages(json.messages || []);
        setPinnedMessageId(json.pinnedMessageId ?? null);
        setPinnedPreview(json.pinnedPreview ?? null);
      }
    }
    async function loadProfile() {
      const res = await fetch("/api/profile");
      const json = await res.json();
      if (!cancelled && json.user) {
        setProfile(json.user);
        setNameDraft(json.user.displayName);
      }
    }
    void load();
    void loadProfile();

    const es = new EventSource("/api/messages/stream");
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        if (payload.type === "messages" && payload.messages?.length) {
          setMessages((prev) => mergeById(prev, payload.messages as MessageDto[]));
        }
        if (payload.type === "message_updated" && payload.messages?.length) {
          setMessages((prev) => mergeById(prev, payload.messages as MessageDto[]));
        }
        if (payload.type === "reads" && payload.reads?.length) {
          const readMap = new Map(
            (payload.reads as { id: string; readAt: string }[]).map((r) => [r.id, r.readAt]),
          );
          setMessages((prev) =>
            prev.map((m) => {
              const readAt = readMap.get(m.id);
              return readAt && !m.readAt ? { ...m, readAt } : m;
            }),
          );
        }
        if (payload.type === "reaction" && payload.messageId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === payload.messageId
                ? { ...m, reactions: payload.reactions as AggregatedReaction[] }
                : m,
            ),
          );
        }
        if (payload.type === "pin") {
          const id = (payload.messageId as string | null) ?? null;
          setPinnedMessageId(id);
          if (!id) setPinnedPreview(null);
        }
        if (payload.type === "presence" && partner && payload.userId === partner.id) {
          setPartnerSeen(payload.lastSeenAt ?? null);
        }
        if (payload.type === "typing" && partner) {
          setPartnerTyping(Boolean(payload.active));
        }
      } catch {
        /* ignore */
      }
    };
    return () => {
      cancelled = true;
      es.close();
    };
  }, [partner]);

  useEffect(() => {
    function beat() {
      if (document.visibilityState !== "visible") return;
      void fetch("/api/chat/presence", { method: "POST" });
    }
    beat();
    const id = window.setInterval(beat, 25_000);
    document.addEventListener("visibilitychange", beat);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", beat);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, stickersOpen]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
  }, [text]);

  function clearComposerExtras() {
    setReplyTo(null);
    setQuoteText(null);
    setEditingId(null);
  }

  function scheduleTyping() {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      void fetch("/api/chat/typing", { method: "POST" });
    }, 1000);
  }

  async function sendBody(body: string) {
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    try {
      if (editingId) {
        const res = await fetch(`/api/messages/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: trimmed }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Не удалось изменить");
        if (json.message) {
          setMessages((prev) => mergeById(prev, [json.message as MessageDto]));
        }
        clearComposerExtras();
        setText("");
        return;
      }

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: trimmed,
          replyToId: replyTo?.id,
          quoteText: quoteText || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Не удалось отправить");
      if (json.message) {
        setMessages((prev) => mergeById(prev, [json.message as MessageDto]));
      }
      setText("");
      // After send (including sticker-as-reply), clear reply/edit chrome like Telegram.
      clearComposerExtras();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSending(false);
      setStickersOpen(false);
    }
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text;
    await sendBody(body);
  }

  function onComposerKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendBody(text);
    }
    if (e.key === "Escape" && (editingId || replyTo)) {
      clearComposerExtras();
      setText("");
    }
  }

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileError("");
    const fd = new FormData(e.currentTarget);
    fd.set("displayName", nameDraft.trim());
    const res = await fetch("/api/profile", { method: "PATCH", body: fd });
    const json = await res.json();
    if (!res.ok) {
      setProfileError(json.error || "Не удалось сохранить");
      return;
    }
    setProfile(json.user);
    setProfileOpen(false);
    try {
      await update({ name: json.user.displayName });
    } catch {
      /* optional */
    }
  }

  async function toggleReaction(messageId: string, emoji: string) {
    setMenu(null);
    const res = await fetch(`/api/messages/${messageId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Реакция не сохранилась");
      return;
    }
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, reactions: json.reactions as AggregatedReaction[] } : m,
      ),
    );
  }

  async function setPin(messageId: string | null) {
    setMenu(null);
    const res = await fetch("/api/chat/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Не удалось закрепить");
      return;
    }
    const id = (json.messageId as string | null) ?? null;
    setPinnedMessageId(id);
    if (!id) {
      setPinnedPreview(null);
    } else {
      const m = messages.find((x) => x.id === id);
      if (m) setPinnedPreview({ id: m.id, body: m.body, authorName: m.author.displayName });
    }
  }

  async function runSearch(q: string) {
    setSearchQ(q);
    setSearchNote("");
    if (!q.trim()) {
      setSearchHits([]);
      return;
    }
    const res = await fetch(`/api/messages/search?q=${encodeURIComponent(q.trim())}`);
    const json = await res.json();
    setSearchHits(json.messages || []);
  }

  function openReply(m: MessageDto, quote?: string | null) {
    setMenu(null);
    setEditingId(null);
    setReplyTo(m);
    setQuoteText(quote?.trim() || null);
    textareaRef.current?.focus();
  }

  function openEdit(m: MessageDto) {
    setMenu(null);
    setReplyTo(null);
    setQuoteText(null);
    setEditingId(m.id);
    setText(m.body);
    textareaRef.current?.focus();
  }

  function selectionQuoteFor(messageId: string): string | null {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return null;
    const textSel = sel.toString().trim();
    if (!textSel) return null;
    const node = sel.anchorNode;
    const el = node instanceof Element ? node : node?.parentElement;
    if (!el?.closest(`[data-message-id="${messageId}"]`)) return null;
    return textSel.slice(0, 500);
  }

  function startPress(messageId: string, clientX: number, clientY: number) {
    pressStart.current = { x: clientX, y: clientY };
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      setMenu({ messageId, x: clientX, y: clientY });
      pressTimer.current = null;
    }, LONG_PRESS_MS);
  }

  function movePress(clientX: number, clientY: number) {
    if (!pressStart.current || !pressTimer.current) return;
    const dx = Math.abs(clientX - pressStart.current.x);
    const dy = Math.abs(clientY - pressStart.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  function endPress() {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressStart.current = null;
  }

  const menuMessage = menu ? messages.find((m) => m.id === menu.messageId) : null;

  return (
    <div className="chat-page">
      {partner ? (
        <header className="chat-header">
          <Avatar name={partner.displayName} src={partner.avatarPath} size="md" />
          <div className="chat-header__meta">
            <strong>{partner.displayName}</strong>
            <span className="chat-header__status">{subtitle}</span>
          </div>
          <button
            type="button"
            className={searchOpen ? "chat-icon-btn is-active" : "chat-icon-btn"}
            aria-label="Поиск"
            onClick={() => {
              setSearchOpen((v) => !v);
              setStickersOpen(false);
              setProfileOpen(false);
            }}
          >
            <SearchIcon />
          </button>
          <button
            type="button"
            className={profileOpen ? "chat-icon-btn is-active" : "chat-icon-btn"}
            aria-label="Ваш профиль"
            onClick={() => {
              setProfileOpen((v) => !v);
              setStickersOpen(false);
              setSearchOpen(false);
            }}
          >
            <ProfileIcon />
          </button>
        </header>
      ) : null}

      {pinnedBar ? (
        <div className="chat-pin-bar">
          <button
            type="button"
            className="chat-pin-bar__body"
            onClick={() => {
              if (!scrollToMessage(pinnedBar.id)) {
                setError("Закреплённое сообщение вне загруженной истории");
              }
            }}
          >
            <span className="chat-pin-bar__label">Закреплено</span>
            <span className="chat-pin-bar__text">{pinnedBar.body}</span>
          </button>
          <button type="button" className="chat-icon-btn" aria-label="Открепить" onClick={() => void setPin(null)}>
            <CloseIcon />
          </button>
        </div>
      ) : null}

      {searchOpen ? (
        <div className="chat-search">
          <input
            className="chat-search__input"
            value={searchQ}
            onChange={(e) => void runSearch(e.target.value)}
            placeholder="Поиск по сообщениям…"
            autoFocus
          />
          {searchNote ? <p className="meta">{searchNote}</p> : null}
          <div className="chat-search__hits">
            {searchHits.map((m) => (
              <button
                key={m.id}
                type="button"
                className="chat-search__hit"
                onClick={() => {
                  if (!scrollToMessage(m.id)) {
                    setSearchNote("Сообщение вне загруженной истории");
                  } else {
                    setSearchNote("");
                    setSearchOpen(false);
                  }
                }}
              >
                <span className="meta">{m.author.displayName}</span>
                <span>{m.body}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {profileOpen ? (
        <div className="chat-profile-sheet" role="dialog" aria-label="Ваш профиль">
          <div className="chat-profile-sheet__head">
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
              <Avatar name={profile?.displayName || "Вы"} src={profile?.avatarPath} size="lg" />
              <div>
                <strong>Ваш профиль</strong>
                <p className="meta" style={{ margin: 0 }}>
                  Имя и фото в чате
                </p>
              </div>
            </div>
            <button
              type="button"
              className="chat-icon-btn"
              onClick={() => setProfileOpen(false)}
              aria-label="Закрыть"
            >
              <CloseIcon />
            </button>
          </div>
          <form onSubmit={saveProfile} className="chat-profile-sheet__form">
            {profileError ? <p className="error-text">{profileError}</p> : null}
            <div className="field">
              <label htmlFor="displayName">Имя в чате</label>
              <input
                id="displayName"
                name="displayName"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                maxLength={40}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="avatar">Фото</label>
              <input id="avatar" name="avatar" type="file" accept="image/*" />
            </div>
            <button type="submit" className="chat-profile-sheet__save">
              Сохранить
            </button>
          </form>
        </div>
      ) : null}

      <div className="chat-log" ref={logRef} onClick={() => setMenu(null)}>
        {messages.length === 0 ? (
          <p className="chat-empty">Напишите первое сообщение любимому человеку.</p>
        ) : null}
        {rows.map((row) => {
          if (row.kind === "day") {
            return (
              <div key={row.key} className="chat-day">
                <span>{row.label}</span>
              </div>
            );
          }
          const { message: m, mine, firstInGroup, lastInGroup } = row;
          const sticker = isStickerBody(m.body);
          return (
            <div
              key={row.key}
              data-message-id={m.id}
              className={[
                "chat-row",
                mine ? "chat-row--mine" : "chat-row--theirs",
                firstInGroup ? "chat-row--first" : "",
                lastInGroup ? "chat-row--last" : "chat-row--grouped",
                highlightId === m.id ? "chat-row--flash" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {!mine ? (
                <div className="chat-row__avatar">
                  {lastInGroup ? (
                    <Avatar name={m.author.displayName} src={m.author.avatarPath} size="sm" />
                  ) : null}
                </div>
              ) : null}
              <div className="chat-bubble-wrap">
                {m.replyTo ? (
                  <button
                    type="button"
                    className="chat-reply-chip"
                    onClick={() => scrollToMessage(m.replyTo!.id)}
                  >
                    <strong>{m.replyTo.author.displayName}</strong>
                    <span>{m.quoteText || m.replyTo.body}</span>
                  </button>
                ) : null}
                <div
                  className={[
                    "chat-bubble",
                    mine ? "chat-bubble--mine" : "chat-bubble--theirs",
                    lastInGroup ? "chat-bubble--tail" : "",
                    sticker ? "chat-bubble--sticker" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenu({ messageId: m.id, x: e.clientX, y: e.clientY });
                  }}
                  onPointerDown={(e) => {
                    if (e.pointerType === "mouse" && e.button !== 0) return;
                    startPress(m.id, e.clientX, e.clientY);
                  }}
                  onPointerMove={(e) => movePress(e.clientX, e.clientY)}
                  onPointerUp={endPress}
                  onPointerCancel={endPress}
                >
                  <span className={sticker ? "chat-bubble__sticker" : "chat-bubble__text"}>
                    {m.body}
                  </span>
                  <span className="chat-bubble__meta">
                    {m.editedAt ? <span className="chat-edited">изм.</span> : null}
                    <time dateTime={m.createdAt}>
                      {new Date(m.createdAt).toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                    {mine ? (
                      <span
                        className={m.readAt ? "chat-checks chat-checks--read" : "chat-checks"}
                        aria-label={m.readAt ? "Прочитано" : "Отправлено"}
                      >
                        {m.readAt ? "✓✓" : "✓"}
                      </span>
                    ) : null}
                  </span>
                </div>
                {m.reactions?.length ? (
                  <div className={`chat-reactions ${mine ? "chat-reactions--mine" : ""}`}>
                    {m.reactions.map((r) => (
                      <button
                        key={r.emoji}
                        type="button"
                        className={r.me ? "chat-reactions__btn is-me" : "chat-reactions__btn"}
                        onClick={() => void toggleReaction(m.id, r.emoji)}
                      >
                        {r.emoji}
                        {r.count > 1 ? <span>{r.count}</span> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {menu && menuMessage ? (
        <div className="chat-menu" style={{ left: Math.min(menu.x, window.innerWidth - 220), top: Math.min(menu.y, window.innerHeight - 280) }}>
          <button type="button" onClick={() => openReply(menuMessage)}>
            Ответить
          </button>
          <button
            type="button"
            onClick={() => openReply(menuMessage, selectionQuoteFor(menuMessage.id))}
          >
            Цитировать
          </button>
          {menuMessage.authorId === me ? (
            <button type="button" onClick={() => openEdit(menuMessage)}>
              Изменить
            </button>
          ) : null}
          <div className="chat-menu__reactions">
            {CHAT_REACTIONS.map((emoji) => (
              <button key={emoji} type="button" onClick={() => void toggleReaction(menuMessage.id, emoji)}>
                {emoji}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void setPin(pinnedMessageId === menuMessage.id ? null : menuMessage.id)}
          >
            {pinnedMessageId === menuMessage.id ? "Открепить" : "Закрепить"}
          </button>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(menuMessage.body);
              setMenu(null);
            }}
          >
            Копировать
          </button>
        </div>
      ) : null}

      {stickersOpen ? (
        <div className="chat-stickers" aria-label="Стикеры">
          {CHAT_STICKERS.map((sticker) => (
            <button
              key={sticker}
              type="button"
              className="chat-stickers__btn"
              onClick={() => void sendBody(sticker)}
            >
              {sticker}
            </button>
          ))}
        </div>
      ) : null}

      {(replyTo || editingId) && (
        <div className="chat-composer-bar">
          <div className="chat-composer-bar__text">
            <strong>{editingId ? "Редактирование" : `Ответ · ${replyTo?.author.displayName}`}</strong>
            <span>{editingId ? text.slice(0, 80) : quoteText || replyTo?.body}</span>
          </div>
          <button type="button" className="chat-icon-btn" aria-label="Отмена" onClick={clearComposerExtras}>
            <CloseIcon />
          </button>
        </div>
      )}

      {error ? <p className="chat-error">{error}</p> : null}

      <form className="chat-composer" onSubmit={send}>
        <button
          type="button"
          className={stickersOpen ? "chat-icon-btn is-active" : "chat-icon-btn"}
          aria-label="Стикеры"
          aria-pressed={stickersOpen}
          onClick={() => {
            setStickersOpen((v) => !v);
            setProfileOpen(false);
            setSearchOpen(false);
          }}
        >
          <StickerIcon />
        </button>
        <textarea
          ref={textareaRef}
          className="chat-composer__input"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value.trim()) scheduleTyping();
          }}
          onKeyDown={onComposerKey}
          placeholder={editingId ? "Изменить сообщение…" : "Сообщение…"}
          maxLength={4000}
          rows={1}
          enterKeyHint="send"
          autoComplete="off"
        />
        <button
          type="submit"
          className="chat-send"
          disabled={!text.trim() || sending}
          aria-label="Отправить"
        >
          <SendIcon />
        </button>
      </form>
    </div>
  );
}
