import crypto from "crypto";

const SECRET =
  process.env.SESSION_SECRET ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "csl-dev-secret-2024";

export function createSessionToken(userId: string): string {
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const payload = `${userId}:${exp}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifySessionToken(token: string): string | null {
  try {
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx < 0) return null;
    const payloadB64 = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);
    const payload = Buffer.from(payloadB64, "base64url").toString();
    const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
    if (sig !== expected) return null;
    const colonIdx = payload.lastIndexOf(":");
    const expStr = payload.slice(colonIdx + 1);
    if (Date.now() > Number(expStr)) return null;
    return payload.slice(0, colonIdx);
  } catch {
    return null;
  }
}
