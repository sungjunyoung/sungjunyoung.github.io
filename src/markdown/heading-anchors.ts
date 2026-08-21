import type { HastPluginDefinition } from "satteri";

const HEADINGS = ["h1", "h2", "h3", "h4", "h5", "h6"];

/**
 * Appends the `#` permalink anchor that hello-friend rendered from
 * `layouts/_default/_markup/render-heading.html`. Sätteri has already assigned
 * heading ids by this point, so this only has to hang the link off them.
 */
export const headingAnchorsPlugin: HastPluginDefinition = {
  name: "heading-anchors",
  element: {
    filter: HEADINGS,
    visit(node, ctx) {
      const id = node.properties?.id;
      if (typeof id !== "string" || id === "") return;

      ctx.appendChild(node, {
        type: "element",
        tagName: "a",
        properties: {
          href: `#${id}`,
          className: ["h-anchor"],
          ariaHidden: "true",
        },
        children: [{ type: "text", value: "#" }],
      });
    },
  },
};
