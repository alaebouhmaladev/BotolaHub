/** @type {import('next').NextConfig} */
const apiBackendUrl = (
  process.env.API_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

const nextConfig = {
  transpilePackages: [
    "@botolahub/design-tokens",
    "@botolahub/localization",
    "@botolahub/contracts",
    "@botolahub/api-client",
  ],
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiBackendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
