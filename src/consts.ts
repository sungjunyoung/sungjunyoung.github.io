export const SITE = {
  title: "sungjunyoung",
  subtitle: "",
  description: "",
  author: "Junyoung, Sung",
  url: "https://sungjunyoung.dev",
  lang: "en-us",
  postsPerPage: 5,
  googleAnalyticsId: "G-CMFR9WZ898",
  adsenseClient: "ca-pub-6425995549268997",
} as const;

export const MENU = [{ name: "About", url: "/about/" }] as const;

export const LABELS = {
  readMore: "Read More",
  readOtherPosts: "Read other posts",
  newerPosts: "Newer posts",
  olderPosts: "Older posts",
  menuMore: "Show more",
} as const;

/**
 * Hugo rendered `.Date.Format "2006-01-02"` in the date's own offset, and every
 * post is authored with +09:00. Formatting in Asia/Seoul reproduces the exact
 * strings the old site served, so permalinks and dates stay stable.
 */
const DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatDate(date: Date): string {
  return DATE_FORMATTER.format(date);
}
