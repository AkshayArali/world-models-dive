import path from "path";
import { defineConfig } from "vite";

const threePkg = path.resolve(__dirname, "node_modules/three");

export default defineConfig({
  resolve: {
    alias: { three: threePkg },
    dedupe: ["three"],
  },
  server: { host: "0.0.0.0", port: 8081, open: true },
  build: {
    outDir: "dist",
    target: "esnext",
    rollupOptions: { input: "./index.html" },
  },
  esbuild: { target: "esnext" },
  publicDir: "public",
  base: "./",
});
