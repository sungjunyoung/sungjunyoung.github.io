// @ts-check
import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import sitemap from "@astrojs/sitemap";
import { gemojiPlugin } from "./src/markdown/gemoji";

// https://astro.build/config
export default defineConfig({
  site: "https://sungjunyoung.dev",
  trailingSlash: "always",
  build: {
    format: "directory",
  },
  integrations: [sitemap()],
  markdown: {
    // hello-friend shipped a Prism "tomorrow night eighties" stylesheet, so
    // keeping Prism lets src/styles/prism.css apply verbatim.
    syntaxHighlight: "prism",
    processor: satteri({
      mdastPlugins: [gemojiPlugin],
    }),
  },
});
