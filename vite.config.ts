import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      pwaAssets: { disabled: true },
      includeAssets: ["favicon/favicon.ico", "favicon/apple-touch-icon.png"],
      manifest: {
        name: "Bible Reader",
        short_name: "Bible",
        description: "Read, search, and save Scripture in your browser.",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        display: "standalone",
        icons: [
          {
            src: "favicon/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "favicon/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: { globPatterns: ["**/*.{js,css,html,ico,png,woff2}"] },
    }),
  ],
  test: {
    globals: true,
    environment: "jsdom",
    execArgv: ["--no-experimental-webstorage"],
    setupFiles: "./tests/setup-tests.ts",
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "dist"],
  },
  server: {
    host: true,
    port: 3000,
    allowedHosts: [".ngrok-free.app", "localhost", "127.0.0.1"],
  },
  resolve: { tsconfigPaths: true },
});
