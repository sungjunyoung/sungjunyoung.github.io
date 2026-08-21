import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getPosts, postUrl } from "../utils/posts";
import { excerpt } from "../utils/excerpt";
import { SITE } from "../consts";

// Hugo published the home feed at /index.xml — keeping the path so existing
// subscribers keep working.
export const GET: APIRoute = async (context) => {
  const posts = await getPosts();

  return rss({
    title: SITE.title,
    description: SITE.description || SITE.title,
    site: context.site ?? SITE.url,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      link: postUrl(post),
      description: post.data.description ?? excerpt(post.body ?? ""),
      categories: [...post.data.tags],
    })),
    customData: `<language>${SITE.lang}</language>`,
  });
};
