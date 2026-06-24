// In development: proxy to local web app.
// In production: call coldspringliquor.com directly. NODE_ENV is guaranteed by Next.js.
export const API =
  process.env.NODE_ENV === "production"
    ? "https://coldspringliquor.com/api"
    : `${process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000"}/api`;
