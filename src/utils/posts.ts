import { getCollection, type CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"posts">;

/** Published posts, newest first — the order Hugo used for lists and pagination. */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection(
    "posts",
    ({ data }) => import.meta.env.DEV || !data.draft,
  );
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function postUrl(post: Post): string {
  return `/posts/${post.id}/`;
}

/** Tag -> post count, alphabetically sorted — used by /tags/ and the 404 page. */
export function tagCounts(posts: Post[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
}
