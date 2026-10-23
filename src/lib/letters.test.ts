import { describe, expect, it } from "vitest";
import { presentLetter } from "@/lib/letters";

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
