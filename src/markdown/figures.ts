import type { HastPluginDefinition } from "satteri";

/**
 * Turns a paragraph holding a single captioned image into a <figure>, so the
 * markdown stays plain `![alt](path "caption")` and still goes through
 * astro:assets — raw <figure> HTML in markdown would not be processed.
 *
 * The caption is carried in the image's title, which is dropped afterwards so
 * browsers do not also show it as a tooltip.
 */
export const figuresPlugin: HastPluginDefinition = {
  name: "markdown-figures",
  element: {
    filter: ["p"],
    visit(node, ctx) {
      const children = (node.children ?? []).filter(
        (child) => !(child.type === "text" && child.value.trim() === ""),
      );
      if (children.length !== 1) return;

      const content = children[0];
      if (!content || content.type !== "element") return;

      // A themed figure has already been folded into a <span> holding both
      // plates, so the caption is on the light one inside it.
      const themed = content.tagName === "span";
      const image = themed
        ? (content.children ?? []).find(
            (child) => child.type === "element" && child.tagName === "img",
          )
        : content;
      if (!image || image.type !== "element" || image.tagName !== "img") return;

      const caption = image.properties?.title;
      if (typeof caption !== "string" || caption === "") return;

      // Rebuilt without `title` rather than cleared with setProperty, which
      // leaves an empty attribute behind. Astro's image handling runs after
      // this plugin and still picks the element up.
      const { title: _caption, ...properties } = image.properties ?? {};
      const figureContent = themed
        ? { ...content, children: (content.children ?? []).map((child) =>
            child === image ? { ...image, properties } : child) }
        : { type: "element" as const, tagName: "img", properties, children: [] };

      ctx.replaceNode(node, {
        type: "element",
        tagName: "figure",
        // hello-friend's figure shortcode defaulted to a left-aligned figure
        // with a centred caption.
        properties: { className: ["left"] },
        children: [
          figureContent,
          {
            type: "element",
            tagName: "figcaption",
            properties: { className: ["center"] },
            children: [{ type: "text", value: caption }],
          },
        ],
      });
    },
  },
};
