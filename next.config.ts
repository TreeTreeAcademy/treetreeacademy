import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static-friendly; content lives in content/ as JSON
  output: undefined,
  // 树儿学院学习中心: static app in public/reader (login-protected by middleware.ts)
  async redirects() {
    return [{ source: "/reader", destination: "/reader/index.html", permanent: false }];
  },
};

export default nextConfig;
