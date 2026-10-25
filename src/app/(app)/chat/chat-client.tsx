"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { CHAT_STICKERS } from "@/lib/constants";

type Message = {
  id: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  authorId: string;
  author: { id: string; displayName: string; avatarPath?: string | null };
};

type Person = {
  id: string;
  displayName: string;
  avatarPath: string | null;
};

const GROUP_GAP_MS = 5 * 60 * 1000;

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
  return body.length <= 3 && /\p{Extended_Pictographic}/u.test(body);
}

type Row =
  | { kind: "day"; key: string; label: string }
  | {
      kind: "msg";
      key: string;
      message: Message;
      mine: boolean;
      firstInGroup: boolean;
      lastInGroup: boolean;
    };

function buildRows(messages: Message[], me: string | undefined): Row[] {
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

export function ChatClient({ partner }: { partner: Person | null }) {
  const { data, update } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [profile, setProfile] = useState<Person | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [stickersOpen, setStickersOpen] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Prefer session; fall back to profile so bubbles don't flip sides while session loads
  const me = data?.user?.id || profile?.id;
  const rows = useMemo(() => buildRows(messages, me), [messages, me]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/messages");
      const json = await res.json();
      if (!cancelled) setMessages(json.messages || []);
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
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const next = [...prev];
            for (const m of payload.messages as Message[]) {
              if (!ids.has(m.id)) next.push(m);
            }
            return next;
          });
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
      } catch {
        /* ignore */
      }
    };
    return () => {
      cancelled = true;
      es.close();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, stickersOpen]);

  async function sendBody(body: string) {
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      const json = await res.json();
      if (json.message) {
        setMessages((prev) =>
          prev.some((m) => m.id === json.message.id) ? prev : [...prev, json.message],
        );
      }
    } finally {
      setSending(false);
    }
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text;
    setText("");
    setStickersOpen(false);
    await sendBody(body);
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
      /* session update optional */
    }
  }

  const headerName = partner?.displayName || "Чат";
  const headerAvatar = partner?.avatarPath;

  return (
    <div className="chat-page">
      <header className="chat-top">
        <button
          type="button"
          className="chat-top__btn"
          onClick={() => {
            setProfileOpen(true);
            setStickersOpen(false);
          }}
          aria-label="Профиль и настройки чата"
        >
          <Avatar name={headerName} src={headerAvatar} size="lg" />
          <div className="chat-top__meta">
            <strong className="chat-top__name">{headerName}</strong>
            <span className="chat-top__sub">Только вы двое</span>
          </div>
        </button>
      </header>

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
              ✕
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

      <div className="chat-log">
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
              className={[
                "chat-row",
                mine ? "chat-row--mine" : "chat-row--theirs",
                firstInGroup ? "chat-row--first" : "",
                lastInGroup ? "chat-row--last" : "chat-row--grouped",
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
              <div
                className={[
                  "chat-bubble",
                  mine ? "chat-bubble--mine" : "chat-bubble--theirs",
                  lastInGroup ? "chat-bubble--tail" : "",
                  sticker ? "chat-bubble--sticker" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className={sticker ? "chat-bubble__sticker" : "chat-bubble__text"}>
                  {m.body}
                </span>
                <span className="chat-bubble__meta">
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
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {stickersOpen ? (
        <div className="chat-stickers" aria-label="Стикеры">
          {CHAT_STICKERS.map((sticker) => (
            <button
              key={sticker}
              type="button"
              className="chat-stickers__btn"
              onClick={() => {
                void sendBody(sticker);
                setStickersOpen(false);
              }}
            >
              {sticker}
            </button>
          ))}
        </div>
      ) : null}

      <form className="chat-composer" onSubmit={send}>
        <button
          type="button"
          className={stickersOpen ? "chat-icon-btn is-active" : "chat-icon-btn"}
          aria-label="Стикеры"
          aria-pressed={stickersOpen}
          onClick={() => setStickersOpen((v) => !v)}
        >
          ☺
        </button>
        <input
          className="chat-composer__input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Сообщение…"
          maxLength={4000}
          enterKeyHint="send"
          autoComplete="off"
        />
        <button
          type="submit"
          className="chat-send"
          disabled={!text.trim() || sending}
          aria-label="Отправить"
        >
          ➤
        </button>
      </form>
    </div>
  );
}
