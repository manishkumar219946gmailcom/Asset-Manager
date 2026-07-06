import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Defaults for local development and Vercel
const port = Number(process.env.PORT ?? 5173);
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig(async () => {
  const plugins = [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
  ];

  // Load Replit-only plugins only inside Replit development
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID
  ) {
    const { cartographer } = await import(
      "@replit/vite-plugin-cartographer"
    );

    const { devBanner } = await import(
      "@replit/vite-plugin-dev-banner"
    );

    plugins.push(
      cartographer({
        root: path.resolve(import.meta.dirname, ".."),
      })
    );

    plugins.push(devBanner());
  }

  return {
    base: basePath,

    plugins,

    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(
          import.meta.dirname,
          "..",
          "..",
          "attached_assets"
        ),
      },
      dedupe: ["react", "react-dom"],
    },

    root: path.resolve(import.meta.dirname),

    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },

    server: {
      port,
      strictPort: false,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
      },
    },

    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
