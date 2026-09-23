import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.68.80'],
  // Tree-shake heavy barrel-export packages in dev too (default in prod only).
  // Without this, every `import { X } from 'lucide-react'` pulls the full
  // 929 KB bundle into the dev dep graph — across 28 files and HMR cycles
  // that's what was OOMing the dev server.
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts'],
    staleTimes: { dynamic: 0, static: 30 },
  },
};

export default nextConfig;
