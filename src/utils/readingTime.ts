/**
 * Estimated reading time for a post, in whole minutes.
 *
 * The posts mix three kinds of material that are read at very different
 * speeds, so each is counted on its own clock rather than folded into a
 * single words-per-minute figure — a words-per-minute count in particular
 * badly undercounts Korean, where a "word" is a whole clause-sized eojeol.
 *
 *   - Hangul and other CJK is counted per character. 500/min is the middle of
 *     the range usually quoted for reading Korean prose on screen.
 *   - Latin text is counted per word at the standard 220 wpm.
 *   - Code blocks are counted per line. Readers skim them rather than parse
 *     every token, but a line still costs far more than the same number of
 *     prose characters, so it gets its own rate. 40/min is a blend: dense
 *     source is slower than that, but most of the blocks here are shell
 *     output and YAML, which are scanned rather than read.
 */
const CJK_CHARS_PER_MINUTE = 500;
const LATIN_WORDS_PER_MINUTE = 220;
const CODE_LINES_PER_MINUTE = 40;

const CJK = /[ㄱ-ㆎ가-힣぀-ヿ一-鿿]/g;
const LATIN_WORD = /[A-Za-z0-9][A-Za-z0-9'’._/-]*/g;

export function readingMinutes(markdown: string): number {
  const codeLines = countFencedCodeLines(markdown);

  const prose = markdown
    .replace(/```[\s\S]*?```/g, " ") // fenced code, counted above
    .replace(/^\s{4,}\S.*$/gm, " ") // indented code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> their text
    .replace(/<[^>]+>/g, " ") // raw html
    .replace(/`[^`]*`/g, " ") // inline code
    .replace(/[#>*_~|-]/g, " "); // leftover markdown furniture

  const minutes =
    (prose.match(CJK)?.length ?? 0) / CJK_CHARS_PER_MINUTE +
    (prose.match(LATIN_WORD)?.length ?? 0) / LATIN_WORDS_PER_MINUTE +
    codeLines / CODE_LINES_PER_MINUTE;

  // Every post is at least a one-minute read; a "0분" badge tells the reader
  // nothing useful.
  return Math.max(1, Math.round(minutes));
}

function countFencedCodeLines(markdown: string): number {
  let lines = 0;
  for (const block of markdown.match(/```[\s\S]*?```/g) ?? []) {
    // Both fence lines are chrome, not content.
    lines += Math.max(0, block.split("\n").length - 2);
  }
  return lines;
}
