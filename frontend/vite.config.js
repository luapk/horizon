import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The demo build is inlined into one self-contained HTML (no module server,
// CSP blocks external requests), so force everything into a single JS chunk.
const isDemo = process.env.VITE_DEMO === "1";

export default defineConfig({
  plugins: [react()],
  server: {
    // Local dev: the frontend calls same-origin /api (matching production on
    // Vercel) and Vite forwards it to the local backend.
    proxy: { "/api": "http://localhost:8787" },
  },
  build: isDemo
    ? { rollupOptions: { output: { inlineDynamicImports: true, manualChunks: undefined } } }
    : {},
});
