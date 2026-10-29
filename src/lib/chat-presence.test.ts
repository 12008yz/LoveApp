import { describe, expect, it } from "vitest";
import { formatLastSeen, isOnline, ONLINE_MS } from "@/lib/chat-presence";

describe("isOnline", () => {
  it("true within 45s", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    expect(isOnline(new Date(now.getTime() - 10_000), now)).toBe(true);
  });
  it("false after 45s", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    expect(isOnline(new Date(now.getTime() - ONLINE_MS - 1), now)).toBe(false);
  });
  it("false when null", () => {
    expect(isOnline(null)).toBe(false);
  });
});

describe("formatLastSeen", () => {
  it("uses был for boy when offline", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    const at = new Date(now.getTime() - 5 * 60_000);
    expect(formatLastSeen(at, "boy", now)).toMatch(/был/i);
  });
  it("uses была for girl", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    const at = new Date(now.getTime() - 5 * 60_000);
    expect(formatLastSeen(at, "girl", now)).toMatch(/была/i);
  });
});
