import { describe, expect, it } from "vitest";
import {
  canEditLetter,
  isActionableUnread,
  isInboxUnread,
  presentLetter,
} from "@/lib/letters";

const base = {
  id: "1",
  authorId: "author",
  title: "Hi",
  body: "secret text",
  unlockAt: new Date("2030-01-01T00:00:00.000Z"),
  openedAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("presentLetter", () => {
  it("lets author read locked letter", () => {
    const view = presentLetter(base, "author", new Date("2026-06-01"));
    expect(view.canRead).toBe(true);
    expect(view.locked).toBe(true);
    expect(view.body).toBe("secret text");
  });

  it("hides body from partner before unlock", () => {
    const view = presentLetter(base, "partner", new Date("2026-06-01"));
    expect(view.canRead).toBe(false);
    expect(view.locked).toBe(true);
    expect(view.body).toBe("");
  });

  it("opens for partner after unlock date", () => {
    const view = presentLetter(base, "partner", new Date("2031-01-01"));
    expect(view.canRead).toBe(true);
    expect(view.locked).toBe(false);
    expect(view.body).toBe("secret text");
  });
});

describe("letter unread helpers", () => {
  it("counts locked partner mail as inbox unread but not actionable", () => {
    const view = presentLetter(base, "partner", new Date("2026-06-01"));
    expect(isInboxUnread(view, "partner")).toBe(true);
    expect(isActionableUnread(view, "partner")).toBe(false);
  });

  it("marks unlocked unopened partner mail as actionable", () => {
    const view = presentLetter(base, "partner", new Date("2031-01-01"));
    expect(isInboxUnread(view, "partner")).toBe(true);
    expect(isActionableUnread(view, "partner")).toBe(true);
  });
});

describe("canEditLetter", () => {
  it("allows author while unopened", () => {
    expect(canEditLetter(base, "author")).toBe(true);
  });

  it("blocks after partner opened", () => {
    expect(canEditLetter({ ...base, openedAt: new Date() }, "author")).toBe(false);
  });

  it("blocks partner", () => {
    expect(canEditLetter(base, "partner")).toBe(false);
  });
});
