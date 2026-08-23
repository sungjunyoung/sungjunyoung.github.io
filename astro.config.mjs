// @ts-check
import { readFileSync, readdirSync } from "node:fs";
import { sep } from "node:path";
import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import sitemap from "@astrojs/sitemap";
import { gemojiPlugin } from "./src/markdown/gemoji";
import { figuresPlugin } from "./src/markdown/figures";
import { calloutsPlugin } from "./src/markdown/callouts";

const SITE_URL = "https://blog.sungjunyoung.dev";
const POSTS_DIR = new URL("./src/content/posts/", import.meta.url);

/**
 * Publication dates, read straight from the frontmatter so the sitemap can
 * carry `lastmod`. Astro's config runs before the content collection exists,
 * hence the hand-rolled read rather than getCollection().
 */
function postDates() {
  const dates = new Map();
  for (const entry of readdirSync(POSTS_DIR, { recursive: true })) {
    const file = String(entry).split(sep).join("/");
    if (!file.endsWith(".md")) continue;
    const source = readFileSync(new URL(file, POSTS_DIR), "utf8");
    // Only the frontmatter block: a `date:` line in prose or inside a fenced
    // code sample must not be mistaken for the publication date.
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatter) continue;
    const match = frontmatter[1].match(/^date:\s*(.+)$/m);
    if (!match) continue;
    const date = new Date(match[1].trim());
    if (Number.isNaN(date.getTime())) continue;
    dates.set(`${SITE_URL}/posts/${file.replace(/\.md$/, "")}/`, date);
  }
  return dates;
}

const DATES = postDates();
const NEWEST = [...DATES.values()].sort((a, b) => b.getTime() - a.getTime())[0];

// /posts/ lists exactly what / lists and carries noindex, so it stays out.
const EXCLUDED = new Set([`${SITE_URL}/posts/`]);

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  trailingSlash: "always",
  build: {
    format: "directory",
  },
  image: {
    service: {
      entrypoint: "astro/assets/services/sharp",
      // The diagrams are wide line art, where resolution matters more than the
      // last few percent of encoder quality. Trading quality for bytes keeps
      // every rendered image under the 20KB the dev-toolbar audit watches for,
      // without downscaling text into illegibility.
      config: { webp: { quality: 80, effort: 6 } },
    },
  },
  integrations: [
    sitemap({
      filter: (page) => !EXCLUDED.has(page),
      serialize(item) {
        const lastmod = DATES.get(item.url) ?? (item.url === `${SITE_URL}/` ? NEWEST : undefined);
        if (lastmod) item.lastmod = lastmod.toISOString();
        return item;
      },
    }),
  ],
  markdown: {
    // hello-friend shipped a Prism "tomorrow night eighties" stylesheet, so
    // keeping Prism lets src/styles/prism.css apply verbatim.
    syntaxHighlight: "prism",
    processor: satteri({
      features: {
        // Sätteri parses GFM footnotes already; this only localises the
        // strings it generates around them. The section heading is visually
        // hidden, so "각주" is what a screen reader announces before the list
        // and the backrefs say where they go back to.
        gfm: {
          footnotes: {
            label: "각주",
            backContent: "↩",
            backLabel: "본문 {reference}로 돌아가기",
          },
        },
      },
      mdastPlugins: [gemojiPlugin, calloutsPlugin],
      hastPlugins: [figuresPlugin],
    }),
  },
});
