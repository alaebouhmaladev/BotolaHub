/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@botolahub/design-tokens',
    '@botolahub/localization',
    '@botolahub/contracts',
    '@botolahub/api-client',
  ],
  reactStrictMode: true,
};

export default nextConfig;
