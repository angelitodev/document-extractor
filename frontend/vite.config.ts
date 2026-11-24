import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const backend = "http://localhost:8000";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // `/templates` is both an API path and a page route: let browser
      // navigations (Accept: text/html) fall through to the SPA.
      "/templates": {
        target: backend,
        bypass: (req) =>
          req.headers.accept?.includes("text/html") ? "/index.html" : undefined,
      },
      "/file": backend,
    },
  },
});
