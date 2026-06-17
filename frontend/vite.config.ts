import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Dev: Vite serves the SPA on http://localhost:5173 and proxies /api/* + /accounts/*
// to Django on http://localhost:8000.
// Build: writes the production bundle to frontend/dist/ with base /static/ for Django.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "/static/" : "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:8000", changeOrigin: true },
      "/accounts": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
}));
