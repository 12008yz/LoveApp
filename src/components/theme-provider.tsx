"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  THEME_STORAGE_KEY,
  applyResolvedTheme,
  readThemePreference,
  resolveTheme,
  type ThemePreference,
} from "@/lib/theme";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: "dark" | "light";
  setPreference: (pref: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("dark");
  const [resolved, setResolved] = useState<"dark" | "light">("dark");

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch {
      /* ignore */
    }
    const next = resolveTheme(pref);
    setResolved(next);
    applyResolvedTheme(next);
  }, []);

  useEffect(() => {
    const pref = readThemePreference();
    setPreferenceState(pref);
    const next = resolveTheme(pref);
    setResolved(next);
    applyResolvedTheme(next);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current = readThemePreference();
      if (current !== "system") return;
      const r = resolveTheme("system", mq.matches);
      setResolved(r);
      applyResolvedTheme(r);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
