import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The demo build is inlined into one self-contained HTML (no module server,
// CSP blocks external requests), so force everything into a single JS chunk.
const isDemo = process.env.VITE_DEMO === "1";

export default defineConfig({
  plugins: [react()],
  build: isDemo
    ? { rollupOptions: { output: { inlineDynamicImports: true, manualChunks: undefined } } }
    : {},
});
