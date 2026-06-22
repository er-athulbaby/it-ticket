import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/uploads/:ticketId/:filename',
        destination: '/api/files/:ticketId/:filename',
      },
    ];
  },
};

export default nextConfig;
