"use client";

import { format, subDays } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

type CheckIn = {
  id: string;
  score: number;
  note: string | null;
  day: string;
  authorId: string;
  author: { displayName: string };
};

export function MoodClient() {
  const { data } = useSession();
  const me = data?.user?.id;
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [score, setScore] = useState(4);

  async function load() {
    const res = await fetch("/api/mood");
    const json = await res.json();
    setCheckIns(json.checkIns || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    await fetch("/api/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score }),
    });
    load();
  }

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), "yyyy-MM-dd")),
    [],
  );

  const mine = checkIns.filter((c) => c.authorId === me);
  const partner = checkIns.filter((c) => c.authorId !== me);

  function avgFor(list: CheckIn[], day: string) {
    const found = list.find((c) => c.day === day);
    return found?.score ?? 0;
  }

  return (
    <div className="stack">
      <div className="soft-panel">
        <p>Сегодня я на {score}/5</p>
        <input
          type="range"
          min={1}
          max={5}
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          style={{ width: "100%" }}
        />
        <button type="button" className="btn btn-primary" onClick={save}>
          Сохранить check-in
        </button>
      </div>
      <div className="grid-2">
        <div className="soft-panel">
          <h3 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Я</h3>
          <div className="mood-bars">
            {days.map((day) => {
              const value = avgFor(mine, day);
              return (
                <div key={day} className="mood-row">
                  <span className="meta">{day.slice(5)}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(value / 5) * 100}%` }} />
                  </div>
                  <span>{value || "—"}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="soft-panel">
          <h3 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Партнёр</h3>
          <div className="mood-bars">
            {days.map((day) => {
              const value = avgFor(partner, day);
              return (
                <div key={day} className="mood-row">
                  <span className="meta">{day.slice(5)}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(value / 5) * 100}%` }} />
                  </div>
                  <span>{value || "—"}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
