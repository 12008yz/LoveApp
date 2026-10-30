import { describe, expect, it } from "vitest";
import { decryptPassword, encryptPassword } from "@/lib/password-share";

describe("password-share", () => {
  it("round-trips plaintext", () => {
    const enc = encryptPassword("secret-pass");
    expect(enc.startsWith("v1:")).toBe(true);
    expect(decryptPassword(enc)).toBe("secret-pass");
  });

  it("returns null for garbage", () => {
    expect(decryptPassword(null)).toBe(null);
    expect(decryptPassword("nope")).toBe(null);
  });
});
