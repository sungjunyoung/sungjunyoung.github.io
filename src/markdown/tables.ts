import type { HastPluginDefinition } from "satteri";

/**
 * Wraps every markdown table in a scroll container.
 *
 * A table is the one block in a post whose width is set by its content rather
 * than by the column it sits in: six columns of figures need the room they
 * need. Squeezed into a 361px phone column they do not fail loudly — each cell
 * just wraps down to two or three characters a line, which is unreadable while
 * still looking like a table. Giving the table its own horizontal scroll lets
 * the cells keep their natural width and hands the reader the usual gesture
 * for reaching the rest.
 *
 * Done here rather than with `display: block; overflow: auto` on the table
 * itself, which would cost the element its table layout — the width, the fixed
 * column algorithm and the rounded outer rule all live on that box.
 *
 * The container is only made focusable when it actually scrolls, which is a
 * runtime question; see initTableScroll in src/scripts/table-scroll.ts.
 */
export const tablesPlugin: HastPluginDefinition = {
  name: "markdown-tables",
  element: {
    filter: ["table"],
    visit(node, ctx) {
      // A wrapped table is visited again through its new parent; without this
      // it would collect a container per pass.
      const parent = ctx.parent(node);
      if (
        parent?.type === "element" &&
        Array.isArray(parent.properties?.className) &&
        parent.properties.className.includes("table-scroll")
      ) {
        return;
      }

      ctx.wrapNode(node, {
        type: "element",
        tagName: "div",
        properties: { className: ["table-scroll"] },
        children: [],
      });
    },
  },
};
