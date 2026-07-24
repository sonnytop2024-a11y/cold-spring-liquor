// Stateless signed session for the admin panel. HMAC-SHA256 over "admin.<expiry>"
// using Web Crypto so it verifies in both the Node route handlers and the
// server-component layout. No DB/session store needed — the signature is the
// proof, the expiry is baked in, and only someone holding ADMIN_SESSION_SECRET
// can forge one.
const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

export async function signAdminSession(ttlMs: number, secret: string): Promise<string> {
  const payload = `admin.${Date.now() + ttlMs}`;
  const sig = toHex(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(payload)));
  return `${payload}.${sig}`;
}

export async function verifyAdminSession(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  if (!payload.startsWith("admin.")) return false;
  const exp = Number(payload.slice("admin.".length));
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = toHex(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(payload)));
  return timingSafeEqual(expected, sig);
}

// Constant-time string compare so a forged signature can't be recovered byte
// by byte from response-timing differences.
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const ADMIN_SESSION_COOKIE = "csl-admin-session";
export const ADMIN_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const ADMIN_SESSION_SECRET_FALLBACK = "csl-admin-session-dev-secret";
