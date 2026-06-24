/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.cloudfront.net" },
      { protocol: "https", hostname: "**.amazonaws.com" },
    ],
  },
  // Rewrite to real API — uncomment when backend is running on port 4000
  // async rewrites() {
  //   return [{
  //     source: "/api/:path*",
  //     destination: `http://localhost:4000/api/:path*`,
  //   }];
  // },
};

export default nextConfig;
