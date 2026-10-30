import { describe, expect, it } from "vitest";
import {
  buildFlamesStatus,
  computeFlameStreak,
  moscowDayKey,
  prevMoscowDayKey,
} from "@/lib/flames";

describe("flames calendar", () => {
  it("prevMoscowDayKey steps back one day", () => {
    expect(prevMoscowDayKey("2026-10-30")).toBe("2026-10-29");
    expect(prevMoscowDayKey("2026-11-01")).toBe("2026-10-31");
  });

  it("computeFlameStreak counts consecutive shared days", () => {
    const today = "2026-10-30";
    expect(computeFlameStreak(["2026-10-30", "2026-10-29", "2026-10-28"], today)).toBe(3);
    expect(computeFlameStreak(["2026-10-29", "2026-10-28"], today)).toBe(2);
    expect(computeFlameStreak(["2026-10-30", "2026-10-28"], today)).toBe(1);
    expect(computeFlameStreak([], today)).toBe(0);
  });

  it("moscowDayKey returns YYYY-MM-DD", () => {
    expect(moscowDayKey(new Date("2026-10-30T12:00:00+03:00"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("buildFlamesStatus requires both members for shared day", () => {
    const today = "2026-10-30";
    const members = ["u1", "u2"];
    const both = buildFlamesStatus({
      checkIns: [
        { userId: "u1", day: today },
        { userId: "u2", day: today },
      ],
      memberIds: members,
      meId: "u1",
      today,
    });
    expect(both.sharedToday).toBe(true);
    expect(both.streak).toBe(1);

    const one = buildFlamesStatus({
      checkIns: [{ userId: "u1", day: today }],
      memberIds: members,
      meId: "u1",
      today,
    });
    expect(one.sharedToday).toBe(false);
    expect(one.meChecked).toBe(true);
    expect(one.partnerChecked).toBe(false);
    expect(one.streak).toBe(0);

    const soloCouple = buildFlamesStatus({
      checkIns: [{ userId: "u1", day: today }],
      memberIds: ["u1"],
      meId: "u1",
      today,
    });
    expect(soloCouple.sharedToday).toBe(false);
    expect(soloCouple.streak).toBe(0);
  });
});
