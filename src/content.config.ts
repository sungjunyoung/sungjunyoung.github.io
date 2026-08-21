import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const posts = defineCollection({
  loader: glob({ base: "./src/content/posts", pattern: "**/*.md" }),
  // Function form so the schema can use `image()`, which resolves a relative
  // path through astro:assets and hands back real dimensions — social cards
  // have to declare the size they actually are.
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      draft: z.boolean().default(false),
      tags: z.array(z.string()).default([]),
      description: z.string().optional(),
      toc: z.boolean().default(true),
      /** Optional social card for this post, ideally 1200x630. */
      cover: image().optional(),
    }),
});

export const collections = { posts };
