import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.ngrok-free.app",
    "*.ngrok.io",
    "10.244.36.38",
    "10.41.253.38",
    "10.*",
    "192.168.*",
    "localhost",
    "127.0.0.1",
  ],
  /* config options here */
};

export default nextConfig;
