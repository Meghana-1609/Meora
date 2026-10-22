import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // Old Meora links (/d/..., /new) now open the new app instead of a 404 page.
  async redirects() {
    return [
      { source: "/d/:path*", destination: "/", permanent: false },
      { source: "/new", destination: "/", permanent: false },
    ];
  },
};
export default nextConfig;
