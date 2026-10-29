/**
 * Short-lived deleted-message ids for SSE (single-process).
 */
export const DELETE_TTL_MS = 30_000;

type Entry = { id: string; at: number };

declare global {
  var __loveDeletes: Map<string, Entry[]> | undefined;
}

function store() {
  if (!globalThis.__loveDeletes) globalThis.__loveDeletes = new Map();
  return globalThis.__loveDeletes;
}

export function recordDeletedMessage(coupleId: string, messageId: string): void {
  const s = store();
  const list = s.get(coupleId) ?? [];
  list.push({ id: messageId, at: Date.now() });
  s.set(coupleId, list);
}

export function takeDeletedSince(coupleId: string, sinceMs: number): string[] {
  const s = store();
  const list = s.get(coupleId);
  if (!list?.length) return [];
  const now = Date.now();
  const kept: Entry[] = [];
  const ids: string[] = [];
  for (const entry of list) {
    if (now - entry.at > DELETE_TTL_MS) continue;
    kept.push(entry);
    if (entry.at > sinceMs) ids.push(entry.id);
  }
  if (kept.length) s.set(coupleId, kept);
  else s.delete(coupleId);
  return ids;
}

export function _resetDeletesForTests(): void {
  store().clear();
}
