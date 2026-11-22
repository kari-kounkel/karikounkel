import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt } from "node:crypto";

/** A new invitation secret: 256 random bits, URL-safe. */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function inviteKey(): Buffer {
  const raw = process.env.INVITE_KEY;
  if (!raw) throw new Error("INVITE_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("INVITE_KEY must be 32 bytes, base64-encoded");
  return key;
}

/** Encrypts a token so the host can re-copy a guest's link later. A database leak alone reveals no links. */
export function encryptToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", inviteKey(), iv);
  const body = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

export function decryptToken(enc: string): string {
  const buf = Buffer.from(enc, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", inviteKey(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}

/**
 * Secret Santa draw. Sattolo's algorithm produces one uniformly random cycle through
 * everyone, so nobody draws themselves and (for 3+ people) no two people draw each other.
 * Returns giver → recipient pairs.
 */
export function drawCycle<T>(ids: readonly T[]): Array<[T, T]> {
  if (ids.length < 3) throw new Error("Secret Santa needs at least 3 people");
  const perm = ids.slice();
  for (let i = perm.length - 1; i > 0; i--) {
    const j = randomInt(0, i); // 0 <= j < i  (never i — that is what makes it a single cycle)
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  return ids.map((giver, i) => [giver, perm[i]]);
}
