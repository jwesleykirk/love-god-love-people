import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
//
// Dev: Vite serves the SPA on http://localhost:5173 and proxies /api/* to
// Django on http://localhost:8000 so the same fetch("/api/example/") works
// in dev and in prod (where Django serves both API and SPA).
//
// Build: writes the production bundle to frontend/dist/. Django reads from
// that path via STATICFILES_DIRS + TEMPLATES.DIRS (see backend/config/settings/base.py).
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
