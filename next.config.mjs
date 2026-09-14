/** @type {import('next').NextConfig} */
const nextConfig = {
  // The demo server (npm run dev:demo) builds into its own folder: two dev
  // servers sharing .next corrupt each other's build.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
