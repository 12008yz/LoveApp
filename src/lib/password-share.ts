import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function keyFromSecret(): Buffer {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "loveapp-dev-secret";
  return createHash("sha256").update(secret).digest();
}

/** Encrypt plaintext password for couple mini-profile sharing. */
export function encryptPassword(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFromSecret(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${enc.toString("base64url")}`;
}

/** Decrypt shared password; null if missing/corrupt. */
export function decryptPassword(payload: string | null | undefined): string | null {
  if (!payload) return null;
  try {
    const [ver, ivB64, tagB64, dataB64] = payload.split(":");
    if (ver !== "v1" || !ivB64 || !tagB64 || !dataB64) return null;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      keyFromSecret(),
      Buffer.from(ivB64, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    const out = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64url")),
      decipher.final(),
    ]);
    return out.toString("utf8");
  } catch {
    return null;
  }
}
