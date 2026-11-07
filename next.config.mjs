/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Se cargan desde node_modules en el servidor (no se empaquetan).
  serverExternalPackages: ["read-excel-file", "postgres"],
};
export default nextConfig;
