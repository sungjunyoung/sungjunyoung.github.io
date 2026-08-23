import type { MdastPluginDefinition } from "satteri";

/**
 * GitHub's alert syntax, so the source stays plain markdown:
 *
 * ```md
 * > [!WARNING]
 * > kubelet은 emptyDir의 사용량을 주기적으로만 확인한다.
 * ```
 *
 * Chosen over a `:::warning` container directive because the posts live in a
 * GitHub repository: this spelling renders as a real callout in GitHub's own
 * preview too, and degrades to an ordinary blockquote anywhere else, so the
 * markdown is never worse off for being read outside the site.
 */
const LABELS = {
  NOTE: "참고",
  TIP: "팁",
  IMPORTANT: "중요",
  WARNING: "주의",
  CAUTION: "경고",
} as const;

type Kind = keyof typeof LABELS;

// The marker sits alone on the blockquote's first line, so the newline after
// it is part of the same text node and is swallowed here along with it.
const MARKER = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*\n?/;

export const calloutsPlugin: MdastPluginDefinition = {
  name: "markdown-callouts",
  blockquote(node, ctx) {
    const first = node.children?.[0];
    if (!first || first.type !== "paragraph") return;

    const lead = first.children?.[0];
    if (!lead || lead.type !== "text") return;

    const match = MARKER.exec(lead.value);
    if (!match) return;

    const kind = match[1] as Kind;
    const body = lead.value.slice(match[0].length);

    // The blockquote is re-labelled in place rather than swapped for a new
    // node: its children stay where they are, so nothing has to survive a
    // round trip back through the op-stream to come out the other side.
    ctx.setProperty(node, "data", {
      hName: "div",
      hProperties: {
        className: ["callout", `callout--${kind.toLowerCase()}`],
      },
    });

    if (body === "") {
      // `> [!NOTE]` on a line of its own, with the text in the next paragraph.
      if ((first.children?.length ?? 0) === 1) ctx.removeNode(first);
      else ctx.removeNode(lead);
    } else {
      ctx.replaceNode(lead, { type: "text", value: body });
    }

    ctx.prependChild(node, {
      type: "calloutLabel",
      data: { hName: "p", hProperties: { className: ["callout__label"] } },
      children: [{ type: "text", value: LABELS[kind] }],
    });
  },
};
