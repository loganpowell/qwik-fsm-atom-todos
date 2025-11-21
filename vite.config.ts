import { defineConfig } from "vite";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { qwikCity } from "@builder.io/qwik-city/vite";

export default defineConfig(({ mode }) => {
  return {
    // Set base path for production (GitHub Pages deployment)
    // In dev mode, use root path
    base: mode === "production" ? "/qwik-fsm-atom-todos/" : "/",
    plugins: [
      qwikCity(),
      qwikVite(/**{ devTools: { clickToSource: false } }**/),
    ],
    server: {
      headers: {
        // Don't cache the server response in dev mode
        "Cache-Control": "public, max-age=0",
      },
    },
    preview: {
      headers: {
        // Do cache the server response in preview (non-adapter production build)
        "Cache-Control": "public, max-age=600",
      },
    },
  };
});
