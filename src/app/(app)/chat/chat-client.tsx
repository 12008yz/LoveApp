"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui";
import { CHAT_STICKERS } from "@/lib/constants";

type Message = {
  id: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  authorId: string;
  author: { id: string; displayName: string; avatarPath?: string | null };
};

type Profile = {
  id: string;
  displayName: string;
  avatarPath: string | null;
};

function Avatar({
  name,
  src,
}: {
  name: string;
  src?: string | null;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="chat-avatar" src={src} alt="" />;
  }
  return (
    <span className="chat-avatar chat-avatar--fallback" aria-hidden>
      {(name || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

export function ChatClient() {
  const { data, update } = useSession();
  const me = data?.user?.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileError, setProfileError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

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
            for (const m of payload.messages) {
              if (!ids.has(m.id)) next.push(m);
            }
            return next;
          });
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
  }, [messages]);

  async function sendBody(body: string) {
    const trimmed = body.trim();
    if (!trimmed) return;
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
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text;
    setText("");
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

  return (
    <div className="stack">
      <div className="soft-panel chat-profile">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Avatar name={profile?.displayName || "Вы"} src={profile?.avatarPath} />
          <div style={{ flex: 1 }}>
            <strong>{profile?.displayName || "Вы"}</strong>
            <p className="meta" style={{ margin: 0 }}>
              Имя и фото в чате
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => setProfileOpen((v) => !v)}>
            {profileOpen ? "Скрыть" : "Изменить"}
          </Button>
        </div>
        {profileOpen ? (
          <form onSubmit={saveProfile} style={{ marginTop: "0.85rem" }}>
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
            <Button type="submit" size="sm">
              Сохранить
            </Button>
          </form>
        ) : null}
      </div>

      <div className="soft-panel chat-layout">
        <div className="chat-log">
          {messages.length === 0 ? (
            <p className="ui-muted" style={{ textAlign: "center", margin: "2rem 0" }}>
              Напишите первое сообщение любимому человеку.
            </p>
          ) : null}
          {messages.map((m) => (
            <div key={m.id} className={m.authorId === me ? "bubble mine" : "bubble"}>
              <div className="meta" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Avatar name={m.author.displayName} src={m.author.avatarPath} />
                {m.author.displayName}
              </div>
              <div style={{ fontSize: m.body.length <= 3 ? "1.6rem" : undefined }}>{m.body}</div>
              <div className="meta">
                {new Date(m.createdAt).toLocaleString("ru-RU", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "numeric",
                  month: "short",
                })}
                {m.authorId === me && m.readAt ? " · прочитано" : ""}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="sticker-bar" aria-label="Стикеры">
          {CHAT_STICKERS.map((sticker) => (
            <button key={sticker} type="button" onClick={() => void sendBody(sticker)}>
              {sticker}
            </button>
          ))}
        </div>
        <form className="chat-form" onSubmit={send}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Сообщение…"
            maxLength={4000}
            enterKeyHint="send"
            autoComplete="off"
          />
          <Button type="submit" size="sm" disabled={!text.trim()}>
            →
          </Button>
        </form>
      </div>
    </div>
  );
}
