"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { GAME_HUB } from "@/lib/constants";

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
  const [stubNote, setStubNote] = useState("");

  async function load() {
    const res = await fetch("/api/games");
    const json = await res.json();
    setSessions(json.sessions || []);
  }

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 2000);
    return () => clearInterval(id);
  }, []);

  async function start(type: "tictactoe" | "words") {
    setStubNote("");
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
    void load();
  }

  const active = sessions.find((s) => s.id === activeId) || sessions[0];

  return (
    <div className="stack">
      <div className="games-hub">
        {GAME_HUB.map((game) => (
          <button
            key={game.id}
            type="button"
            className="games-hub__card"
            aria-disabled={!game.playable}
            onClick={() => {
              if (!game.playable) {
                setStubNote(`«${game.title}» скоро появится — пока сыграйте в крестики или слова.`);
                return;
              }
              void start(game.id as "tictactoe" | "words");
            }}
          >
            <strong>{game.title}</strong>
            <span>{game.blurb}</span>
          </button>
        ))}
      </div>

      {stubNote ? <p className="muted">{stubNote}</p> : null}

      {active?.type === "tictactoe" ? (
        <div className="soft-panel">
          <p className="meta">Мальчик = X, девочка = O · статус: {active.status}</p>
          <div className="board">
            {(active.state.board as (string | null)[]).map((cell, i) => (
              <button
                key={i}
                type="button"
                onClick={() => move(active.id, { index: i })}
                disabled={active.status !== "active" || !!cell}
              >
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
        <h3 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>Недавние партии</h3>
        {sessions.length === 0 ? <p className="muted">Партий пока нет.</p> : null}
        {sessions.slice(0, 8).map((s) => (
          <button
            key={s.id}
            type="button"
            className="list-item"
            style={{ width: "100%", textAlign: "left", cursor: "pointer", border: "none", background: "transparent" }}
            onClick={() => setActiveId(s.id)}
          >
            <strong>{s.type}</strong>
            <div className="meta">{s.status}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
