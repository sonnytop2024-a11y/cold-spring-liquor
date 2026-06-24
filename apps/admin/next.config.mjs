/** @type {import('next').NextConfig} */
const webUrl = process.env.WEB_API_URL ?? "http://localhost:3000";

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
