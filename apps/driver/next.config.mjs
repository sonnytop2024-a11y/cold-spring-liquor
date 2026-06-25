/** @type {import('next').NextConfig} */

// WEB_API_URL must be set in Vercel env vars for the driver project.
// Default to the production web domain so it works even if env var is missing.
const webUrl =
  process.env.WEB_API_URL ??
  process.env.NEXT_PUBLIC_WEB_URL ??
  "https://www.coldspringliquor.com";

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${webUrl}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${webUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
