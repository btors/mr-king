import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  basePath: '/kds',
  turbopack: {
    root: path.resolve(__dirname, "../../"),
  },
};

export default nextConfig;
