// @ts-check
import { defineConfig } from "astro/config";
import { satteri, satteriHeadingIdsPlugin } from "@astrojs/markdown-satteri";
import sitemap from "@astrojs/sitemap";
import { gemojiPlugin } from "./src/markdown/gemoji";
import { headingAnchorsPlugin } from "./src/markdown/heading-anchors";

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
      // Astro assigns heading ids after user plugins run, so pull its own
      // plugin forward to have the ids in hand when the anchors are appended.
      hastPlugins: [satteriHeadingIdsPlugin(), headingAnchorsPlugin],
    }),
  },
});
