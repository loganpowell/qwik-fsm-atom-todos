import { component$, useStyles$ } from "@builder.io/qwik";
import { QwikCityProvider, RouterOutlet } from "@builder.io/qwik-city";
import globalStyles from "./global.css?inline";

export default component$(() => {
  useStyles$(globalStyles);

  useStyles$(`
    * {
      /* Prevent layout shift from font loading */
      font-display: swap;
    }
    
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
      padding: 2rem;
    }
  `);

  return (
    <QwikCityProvider>
      <head>
        <meta charSet="utf-8" />
        <title>FSM + Atom Todo Demo</title>
      </head>
      <body>
        <RouterOutlet />
      </body>
    </QwikCityProvider>
  );
});
