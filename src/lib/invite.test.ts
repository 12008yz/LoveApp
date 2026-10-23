import { describe, expect, it } from "vitest";
import { generateInviteCode } from "@/lib/invite";

describe("generateInviteCode", () => {
  it("returns 8 chars from the safe alphabet", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
  });

  it("produces unique values across many calls", () => {
    const set = new Set(Array.from({ length: 50 }, () => generateInviteCode()));
    expect(set.size).toBe(50);
  });
});
