import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/phaser")) {
            return "phaser-runtime";
          }

          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "react-vendor";
          }

          if (id.includes("/web/src/game/")) {
            return "game-runtime";
          }

          return undefined;
        }
      }
    }
  },
  server: {
    host: "0.0.0.0",
    port: 5173
  }
});
