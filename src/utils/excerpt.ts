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

/**
 * Google shows roughly 155-160 characters of a meta description, so the
 * 70-word list summary is far too long and gets cut mid-sentence. This trims
 * on a word boundary and adds an ellipsis so the tag reads as a whole thought.
 */
const META_LIMIT = 155;

export function metaDescription(text: string, limit = META_LIMIT): string {
  const plain = text.replace(/\s+/g, " ").trim();
  if (plain.length <= limit) return plain;

  const cut = plain.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
