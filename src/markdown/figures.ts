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

      const image = children[0];
      if (!image || image.type !== "element" || image.tagName !== "img") return;

      const caption = image.properties?.title;
      if (typeof caption !== "string" || caption === "") return;

      // Rebuilt without `title` rather than cleared with setProperty, which
      // leaves an empty attribute behind. Astro's image handling runs after
      // this plugin and still picks the element up.
      const { title: _caption, ...properties } = image.properties ?? {};

      ctx.replaceNode(node, {
        type: "element",
        tagName: "figure",
        // hello-friend's figure shortcode defaulted to a left-aligned figure
        // with a centred caption.
        properties: { className: ["left"] },
        children: [
          { type: "element", tagName: "img", properties, children: [] },
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
