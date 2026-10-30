import path from "node:path";
import { fileURLToPath } from "node:url";

const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  turbopack: { root: path.dirname(fileURLToPath(import.meta.url)) },
};
export default nextConfig;
