import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // --- BUILD CONFIGURATION ---
  build: {
    target: "esnext", // 1. Tells Vite to output modern code
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext", // 2. Tells esbuild to handle modern syntax
      supported: { 
        'top-level-await': true // 3. Explicitly allows the feature for high-precision timing
      },
    },
  },
}));