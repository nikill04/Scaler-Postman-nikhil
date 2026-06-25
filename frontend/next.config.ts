import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Makes NEXT_PUBLIC_API_URL available both at build time and runtime.
  // In production, set this environment variable to your deployed backend URL.
  // Example: NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  },
};

export default nextConfig;
