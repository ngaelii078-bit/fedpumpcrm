/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: { root: import.meta.dirname },
  devIndicators: false,
};
export default nextConfig;
