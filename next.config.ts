import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sta LAN-toegang tot de dev-server toe (telefoon op zelfde wifi via IP).
  // Zonder dit blokkeert Next.js 16 cross-origin dev-resources van het LAN-IP.
  allowedDevOrigins: ["192.168.1.161"],
  // Foto's en documenten staan in Supabase Storage; next/image moet ze mogen optimaliseren
  // (lazy loading, WebP, thumbnails). Werkt via Vercel's Image Optimization op productie.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/**",
      },
    ],
  },
};

export default nextConfig;
