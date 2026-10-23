import { describe, expect, it } from "vitest";
import { s3Enabled, storageMode } from "@/lib/storage";

describe("storage mode", () => {
  it("uses local when S3 env is incomplete", () => {
    const env = { S3_ENDPOINT: "http://localhost:9000" };
    expect(s3Enabled(env)).toBe(false);
    expect(storageMode(env)).toBe("local");
  });

  it("uses s3 when all vars are set", () => {
    const env = {
      S3_ENDPOINT: "http://localhost:9000",
      S3_ACCESS_KEY: "a",
      S3_SECRET_KEY: "b",
      S3_BUCKET: "loveapp",
      S3_PUBLIC_URL: "http://localhost:9000/loveapp",
    };
    expect(s3Enabled(env)).toBe(true);
    expect(storageMode(env)).toBe("s3");
  });
});
