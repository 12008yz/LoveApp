"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui";

type Message = {
  id: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  authorId: string;
  author: { id: string; displayName: string };
};

export function ChatClient() {
  const { data } = useSession();
  const me = data?.user?.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/messages");
      const json = await res.json();
      if (!cancelled) setMessages(json.messages || []);
    }
    void load();

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

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const json = await res.json();
    if (json.message) {
      setMessages((prev) =>
        prev.some((m) => m.id === json.message.id) ? prev : [...prev, json.message],
      );
    }
  }

  return (
    <div className="soft-panel chat-layout">
      <div className="chat-log">
        {messages.length === 0 ? (
          <p className="ui-muted" style={{ textAlign: "center", margin: "2rem 0" }}>
            Напишите первое сообщение любимому человеку.
          </p>
        ) : null}
        {messages.map((m) => (
          <div key={m.id} className={m.authorId === me ? "bubble mine" : "bubble"}>
            <div className="meta">{m.author.displayName}</div>
            <div>{m.body}</div>
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
  );
}
