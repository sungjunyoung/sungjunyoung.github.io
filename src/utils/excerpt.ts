/**
 * Approximates Hugo's default `.Summary`: the first 70 words of the rendered
 * content, as plain text. Posts here set no `description`, so the old list
 * pages showed exactly this.
 */
const SUMMARY_LENGTH = 70;

export function excerpt(markdown: string, limit = SUMMARY_LENGTH): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, "") // fenced code
    .replace(/^\s*>\s?/gm, "") // blockquote markers
    .replace(/<[^>]+>/g, "") // raw html
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> text
    .replace(/[*_`#]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const words = plain.split(" ");
  if (words.length <= limit) return plain;
  return words.slice(0, limit).join(" ");
}
