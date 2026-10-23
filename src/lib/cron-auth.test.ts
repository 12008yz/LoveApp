import { describe, expect, it } from "vitest";
import { isCronAuthorized } from "@/lib/cron-auth";

describe("isCronAuthorized", () => {
  it("rejects missing secret", () => {
    const req = new Request("http://localhost/api/cron/reminders", {
      headers: { authorization: "Bearer x" },
    });
    expect(isCronAuthorized(req, undefined)).toBe(false);
  });

  it("rejects wrong bearer", () => {
    const req = new Request("http://localhost/api/cron/reminders", {
      headers: { authorization: "Bearer wrong" },
    });
    expect(isCronAuthorized(req, "secret")).toBe(false);
  });

  it("accepts matching bearer", () => {
    const req = new Request("http://localhost/api/cron/reminders", {
      headers: { authorization: "Bearer secret" },
    });
    expect(isCronAuthorized(req, "secret")).toBe(true);
  });
});
