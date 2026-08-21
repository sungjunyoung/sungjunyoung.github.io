import { nameToEmoji } from "gemoji";
import type { MdastPluginDefinition } from "satteri";

const SHORTCODE = /:([-+\w]+):/g;

/**
 * Replaces GitHub-style `:heart:` shortcodes with the emoji, the way Hugo's
 * `enableEmoji` did. Running on mdast text nodes means code spans and fenced
 * blocks are left alone.
 */
export const gemojiPlugin: MdastPluginDefinition = {
  name: "gemoji",
  text(node, ctx) {
    if (!node.value.includes(":")) return;

    const replaced = node.value.replace(
      SHORTCODE,
      (match, name: string) => nameToEmoji[name] ?? match,
    );
    if (replaced === node.value) return;

    ctx.replaceNode(node, { type: "text", value: replaced });
  },
};
