/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative base so the build works under the GitHub Pages project subpath
  // (https://<user>.github.io/<repo>/). Single-page app with no router.
  base: "./",
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
  },
});
