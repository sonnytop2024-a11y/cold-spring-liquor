// Admin always calls the web app API directly (cross-origin with CORS).
// In local dev: set NEXT_PUBLIC_WEB_URL=http://localhost:3000 in .env.local
// In production: defaults to coldspringliquor.com — no env var required.
const base = (process.env.NEXT_PUBLIC_WEB_URL ?? "https://coldspringliquor.com").replace(/\/$/, "");
export const API = `${base}/api`;
