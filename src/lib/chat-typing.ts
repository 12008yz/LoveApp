/**
 * In-memory "partner is typing" state, keyed by couple.
 * Single-process only (like demo store); entries expire after TYPING_TTL_MS.
 */
export const TYPING_TTL_MS = 3000;

type Entry = { userId: string; at: number };

declare global {
  var __loveTyping: Map<string, Map<string, Entry>> | undefined;
}

function store() {
  if (!globalThis.__loveTyping) globalThis.__loveTyping = new Map();
  return globalThis.__loveTyping;
}

export function setTyping(coupleId: string, userId: string): void {
  const s = store();
  let couple = s.get(coupleId);
  if (!couple) {
    couple = new Map();
    s.set(coupleId, couple);
  }
  couple.set(userId, { userId, at: Date.now() });
}

export function clearTyping(coupleId: string, userId: string): void {
  const couple = store().get(coupleId);
  if (!couple) return;
  couple.delete(userId);
  if (couple.size === 0) store().delete(coupleId);
}

export function getPartnerTyping(
  coupleId: string,
  selfId: string,
): { userId: string } | null {
  const couple = store().get(coupleId);
  if (!couple) return null;
  const now = Date.now();
  for (const [uid, entry] of couple) {
    if (now - entry.at > TYPING_TTL_MS) {
      couple.delete(uid);
      continue;
    }
    if (uid !== selfId) return { userId: uid };
  }
  if (couple.size === 0) store().delete(coupleId);
  return null;
}

export function _resetTypingForTests(): void {
  store().clear();
}
