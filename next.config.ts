import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Let the Next/Vercel optimizer resize and serve modern formats.
    // The source images are very large (several are 6000px+ wide), so
    // optimization is a major page-weight win.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;