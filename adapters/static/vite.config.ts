import { extendConfig } from "@builder.io/qwik-city/vite";
import baseConfig from "../../vite.config";
import { staticAdapter } from "@builder.io/qwik-city/adapters/static/vite";

export default extendConfig(baseConfig, () => {
  return {
    // base: "/qwik-fsm-atom-todos/",
    build: {
      ssr: true,
      rollupOptions: {
        input: ["@qwik-city-plan"],
      },
    },
    plugins: [
      staticAdapter({
        origin: "https://loganpowell.github.io",
      }),
    ],
  };
});
