import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

const dashboardPort = process.env.CTX_DASHBOARD_PORT ?? "19470";
const vitePort = parseInt(process.env.CTX_VITE_PORT ?? "19471", 10);

function loadBrand() {
  // Check env override, then local brand.json, then default
  const envPath = process.env.ORCHARD_BRAND_JSON;
  const candidates = [
    envPath,
    path.resolve(__dirname, "brand.json"),
    path.resolve(__dirname, "../brand.json"),
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    try {
      return JSON.parse(fs.readFileSync(p, "utf8"));
    } catch {
      // continue
    }
  }
  return { name: "Orchard", subtitle: "Command Center" };
}

const brand = loadBrand();

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  define: {
    __BRAND_NAME__: JSON.stringify(brand.name),
    __BRAND_SUBTITLE__: JSON.stringify(brand.subtitle),
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    sourcemap: false,
    minify: "esbuild",
  },
  server: {
    port: vitePort,
    strictPort: true,
    host: "127.0.0.1",
    allowedHosts: [".trycloudflare.com"],
    proxy: {
      "/api": `http://127.0.0.1:${dashboardPort}`,
      "/ws": { target: `ws://127.0.0.1:${dashboardPort}`, ws: true },
    },
  },
});
