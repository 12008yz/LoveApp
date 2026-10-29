"use client";

import { useTheme } from "@/components/theme-provider";
import type { ThemePreference } from "@/lib/theme";

const OPTIONS: { id: ThemePreference; label: string; hint: string }[] = [
  { id: "dark", label: "Тёмная", hint: "Как в референсе — уголь и синий" },
  { id: "light", label: "Светлая", hint: "Тёплый крем и бордо" },
  { id: "system", label: "Как в системе", hint: "Следует настройке телефона" },
];

export function ThemeSettings() {
  const { preference, setPreference } = useTheme();

  return (
    <div className="soft-panel">
      <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Тема</h2>
      <p className="meta" style={{ marginTop: 0, marginBottom: "0.75rem" }}>
        Оформление приложения. Сохраняется на этом устройстве.
      </p>
      <div className="theme-picker" role="radiogroup" aria-label="Тема">
        {OPTIONS.map((opt) => {
          const active = preference === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={active ? "theme-picker__option is-active" : "theme-picker__option"}
              onClick={() => setPreference(opt.id)}
            >
              <strong>{opt.label}</strong>
              <span>{opt.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
