export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

export const THEME_STORAGE_KEY = "loveapp-theme";

export function resolveTheme(pref: ThemePreference, systemDark?: boolean): ResolvedTheme {
  if (pref === "light") return "light";
  if (pref === "dark") return "dark";
  const dark =
    typeof systemDark === "boolean"
      ? systemDark
      : typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
  return dark ? "dark" : "light";
}

export function readThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "dark";
  const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "dark";
}

export function applyResolvedTheme(resolved: ResolvedTheme) {
  document.documentElement.setAttribute("data-theme", resolved);
  const color = resolved === "dark" ? "#0f1218" : "#b4234a";
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute("content", color);
  });
}
