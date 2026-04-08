import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { pathToFileURL } from "node:url";

function generateSitemapsAtBuild(): Plugin {
  return {
    name: "generate-sitemaps-at-build",
    apply: "build",
    async buildStart() {
      const scriptPath = path.resolve(__dirname, "./scripts/generate-sitemaps.mjs");

      try {
        const mod = await import(pathToFileURL(scriptPath).href);
        if (typeof mod.main !== "function") {
          this.warn("[sitemaps] scripts/generate-sitemaps.mjs does not export main()");
          return;
        }
        await mod.main();
      } catch (err) {
        // Don’t break deployments if the cache API is temporarily unavailable.
        // The repo still contains the last generated /public/sitemap-*.xml files.
        this.warn(`[sitemaps] Generation failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    generateSitemapsAtBuild(),
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

