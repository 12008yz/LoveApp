/** Layero preview: no database — in-memory demo store only. */
export function isDemoMode() {
  return process.env.DEMO_MODE === "1" || process.env.DEMO_MODE === "true";
}

export const DEMO_USER = {
  id: "demo-user",
  email: "demo@example.com",
  displayName: "Гость",
  password: "demo1234",
} as const;

export const DEMO_PARTNER = {
  id: "demo-partner",
  email: "partner@loveapp.local",
  displayName: "Демо-партнёр",
} as const;

export const DEMO_COUPLE_ID = "demo-couple";
export const DEMO_INVITE = "DEMO01";
