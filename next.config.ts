import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Os pacotes do Mastra carregam módulos nativos do Node que o bundler não
  // empacota; assim o Next os carrega de node_modules em tempo de execução.
  serverExternalPackages: ["@mastra/*"],
  images: {
    // Imagens de produtos vêm de URLs arbitrárias; avatares vêm do DiceBear.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
