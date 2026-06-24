// Admin API calls go through the local Next.js server, which proxies to the web app:
// - Development: next.config.mjs rewrite → http://localhost:3000/api
// - Production:  apps/admin/src/app/api/[...path]/route.ts → https://coldspringliquor.com/api
// Server-side proxy means no CORS issues; browser always calls same-origin.
export const API = "/api";
