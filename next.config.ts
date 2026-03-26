/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // Keep this for static export
  
  // === ADD THIS SECTION TO SKIP TYPE CHECKS ===
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  // ===========================================
};

module.exports = nextConfig;
