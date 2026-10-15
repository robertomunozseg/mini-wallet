import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // "/" has no page of its own: it always goes to /home (which sends visitors without a session
  // on to /login). A redirect here avoids a page that only calls redirect().
  async redirects() {
    return [{ source: "/", destination: "/home", permanent: false }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
