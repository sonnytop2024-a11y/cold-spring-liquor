/** @type {import('next').NextConfig} */
const nextConfig = {
  // The old "Shop by Category" page is retired — browsing is consolidated into
  // /products (All-tab category carousels). Permanent redirect keeps old
  // bookmarks and Google-indexed links working.
  async redirects() {
    return [{ source: "/categories", destination: "/products", permanent: true }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.cloudfront.net" },
      { protocol: "https", hostname: "**.amazonaws.com" },
      // Supabase Storage public URLs
      { protocol: "https", hostname: "*.supabase.co" },
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
