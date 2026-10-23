"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type SessionItem = {
  id: string;
  type: string;
  status: string;
  state: Record<string, unknown>;
  boyUserId: string | null;
  girlUserId: string | null;
  winnerId: string | null;
};

export function GamesClient() {
  const { data } = useSession();
  const me = data?.user?.id;
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/games");
    const json = await res.json();
    setSessions(json.sessions || []);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 2000);
    return () => clearInterval(id);
  }, []);

  async function start(type: "tictactoe" | "words") {
    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    const json = await res.json();
    if (json.session) {
      setSessions((prev) => [json.session, ...prev]);
      setActiveId(json.session.id);
    }
  }

  async function move(id: string, payload: { index?: number; letter?: string }) {
    await fetch(`/api/games/${id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    load();
  }

  const active = sessions.find((s) => s.id === activeId) || sessions[0];

  return (
    <div className="stack">
      <div className="cta-row" style={{ justifyContent: "flex-start" }}>
        <button type="button" className="btn btn-primary" onClick={() => start("tictactoe")}>
          Крестики-нолики
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => start("words")}>
          Слова
        </button>
      </div>

      {active?.type === "tictactoe" ? (
        <div className="soft-panel">
          <p className="meta">Мальчик = X, девочка = O · статус: {active.status}</p>
          <div className="board">
            {(active.state.board as (string | null)[]).map((cell, i) => (
              <button key={i} type="button" onClick={() => move(active.id, { index: i })} disabled={active.status !== "active" || !!cell}>
                {cell || ""}
              </button>
            ))}
          </div>
          {active.state.winner ? (
            <p>
              {active.state.winner === "draw"
                ? "Ничья"
                : active.winnerId === me
                  ? "Вы победили"
                  : "Победил партнёр"}
            </p>
          ) : null}
        </div>
      ) : null}

      {active?.type === "words" ? (
        <div className="soft-panel">
          <p className="words-mask">{String(active.state.masked || "").split("").join(" ")}</p>
          <p className="meta">
            Ошибки: {String(active.state.wrong)}/{String(active.state.maxWrong)} · {active.status}
          </p>
          <div className="ping-grid">
            {"абвгдеёжзийклмнопрстуфхцчшщъыьэюя".split("").map((letter) => (
              <button
                key={letter}
                type="button"
                className="ping-btn"
                disabled={
                  active.status !== "active" ||
                  (active.state.guesses as string[] | undefined)?.includes(letter) ||
                  active.state.hostId === me
                }
                onClick={() => move(active.id, { letter })}
              >
                {letter}
              </button>
            ))}
          </div>
          {active.state.hostId === me && active.status === "active" ? (
            <p className="muted">Вы загадали слово — ждите ход партнёра.</p>
          ) : null}
        </div>
      ) : null}

      <div className="soft-panel">
        <h3 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>Партии</h3>
        {sessions.map((s) => (
          <button
            key={s.id}
            type="button"
            className="list-item"
            style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer" }}
            onClick={() => setActiveId(s.id)}
          >
            {s.type === "tictactoe" ? "Крестики-нолики" : "Слова"} · {s.status}
          </button>
        ))}
      </div>
    </div>
  );
}
