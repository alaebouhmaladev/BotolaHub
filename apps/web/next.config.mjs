/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@botolahub/config',
    '@botolahub/contracts',
    '@botolahub/design-tokens',
    '@botolahub/localization',
    '@botolahub/api-client',
  ],
};

export default nextConfig;
