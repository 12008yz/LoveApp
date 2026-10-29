import { afterEach, describe, expect, it } from "vitest";
import {
  _resetDeletesForTests,
  recordDeletedMessage,
  takeDeletedSince,
} from "@/lib/chat-deletes";

describe("chat-deletes", () => {
  afterEach(() => _resetDeletesForTests());

  it("returns ids recorded after sinceMs", () => {
    const since = Date.now() - 10;
    recordDeletedMessage("c1", "m1");
    expect(takeDeletedSince("c1", since)).toEqual(["m1"]);
  });

  it("does not re-emit for a later since cursor", () => {
    recordDeletedMessage("c1", "m1");
    const after = Date.now();
    expect(takeDeletedSince("c1", after)).toEqual([]);
  });
});
