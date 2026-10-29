import { describe, expect, it, beforeEach, vi } from "vitest";
import { setTyping, clearTyping, getPartnerTyping, _resetTypingForTests } from "@/lib/chat-typing";

beforeEach(() => _resetTypingForTests());

describe("chat-typing", () => {
  it("returns partner when fresh", () => {
    setTyping("c1", "u2");
    expect(getPartnerTyping("c1", "u1")?.userId).toBe("u2");
  });
  it("ignores self", () => {
    setTyping("c1", "u1");
    expect(getPartnerTyping("c1", "u1")).toBeNull();
  });
  it("expires after TTL", () => {
    vi.useFakeTimers();
    setTyping("c1", "u2");
    vi.advanceTimersByTime(3001);
    expect(getPartnerTyping("c1", "u1")).toBeNull();
    vi.useRealTimers();
  });
  it("clearTyping removes", () => {
    setTyping("c1", "u2");
    clearTyping("c1", "u2");
    expect(getPartnerTyping("c1", "u1")).toBeNull();
  });
});
