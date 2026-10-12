import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const serverPort = env.SERVER_PORT || env.PORT;
  const viteApiUrl = env.VITE_API_URL?.trim();
  /** When `VITE_API_URL` is unset, the app uses same-origin `/api`; proxy to the Bun server (default port matches server/env.ts). */
  const apiProxyTarget =
    viteApiUrl && viteApiUrl.length > 0
      ? viteApiUrl.replace(/\/$/, "")
      : `http://127.0.0.1:${serverPort || "3030"}`;

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        pwaAssets: { disabled: true },
        includeAssets: ["favicon/favicon.ico", "favicon/apple-touch-icon.png"],
        manifest: {
          name: "Bible Reader",
          short_name: "Bible",
          description:
            "Read, search, bookmark, and study the Bible in a fast, offline-friendly web app.",
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
            {
              src: "favicon/android-chrome-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
      }),
    ],
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./tests/setup-tests.ts",
      include: ["tests/**/*.test.{ts,tsx}"],
      // Optimized for Bun's native test runner if needed
      exclude: [
        "node_modules",
        "dist",
        "**/*.bun.test.ts",
        "tests/bible-app/**",
      ],
    },
    server: {
      host: true,
      port: 3000,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
      // Security: Restrict allowed hosts to your specific workflow
      allowedHosts: [".ngrok-free.app", "localhost", "127.0.0.1"],
      // 2026 Feature: Forward browser logs to your terminal
      forwardConsole: true,
    },
    build: {
      // Rolldown (Vite 8) is 10-30x faster.
      // We keep this thin to let the new Rust engine do the work.
      target: "esnext",
    },
    resolve: {
      tsconfigPaths: true,
    },
  };
});
