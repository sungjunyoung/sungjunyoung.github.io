import type { HastPluginDefinition, MdastPluginDefinition } from "satteri";

/**
 * Pairs a body image with a twin drawn on the other theme's ground, so a
 * diagram whose ink is black does not stay black when the page turns dark.
 *
 * The markdown names only the light plate:
 *
 * ```md
 * ![Go, Rust, Python](../../assets/posts/x/langs-light.webp "세 후보")
 * ```
 *
 * and the sibling ending in `-dark` is shipped alongside it. Both plates are in
 * the page and CSS picks one, which is what Cover.astro already does for the
 * social plate: `<picture>` with prefers-color-scheme cannot be used here
 * because the theme is a class the reader toggles, and a media query does not
 * see that — nor would it swap without a reload.
 *
 * This takes two passes. The twin has to be written into the MARKDOWN tree,
 * because astro:assets resolves the images it collected from the source and
 * nothing else — an `<img>` conjured later in hast keeps its raw `../../`
 * src and never gets built. So the mdast pass adds the second image node and
 * the hast pass folds the resulting pair back into one element.
 */
const LIGHT_PLATE = /-light(\.[a-z0-9]+)$/i;

/** Only the image is in the paragraph — the same shape figuresPlugin wants. */
function loneChild<T extends { type: string; value?: string }>(children: T[]) {
  const kept = children.filter(
    (child) => !(child.type === "text" && (child.value ?? "").trim() === ""),
  );
  return kept.length === 1 ? kept[0] : undefined;
}

export const themedImagesMdastPlugin: MdastPluginDefinition = {
  name: "markdown-themed-images-collect",
  paragraph(node, ctx) {
    const image = loneChild(node.children ?? []);
    if (!image || image.type !== "image") return;
    const url = (image as { url?: string }).url;
    if (typeof url !== "string" || !LIGHT_PLATE.test(url)) return;

    // Alt is left off the twin: only one of the two is ever displayed, and
    // announcing the same figure twice is worse than announcing it once.
    ctx.replaceNode(node, {
      ...node,
      children: [
        ...(node.children ?? []),
        { type: "image", url: url.replace(LIGHT_PLATE, "-dark$1"), alt: "" },
      ],
    });
  },
};

export const themedImagesPlugin: HastPluginDefinition = {
  name: "markdown-themed-images",
  element: {
    filter: ["p"],
    visit(node, ctx) {
      const images = (node.children ?? []).filter(
        (child) => child.type === "element" && child.tagName === "img",
      );
      if (images.length !== 2) return;

      const [light, dark] = images;
      const src = light.properties?.src;
      if (typeof src !== "string" || !LIGHT_PLATE.test(src)) return;

      // No class on either plate. These go on to astro:assets, which passes
      // through props it does not recognise, and satteri writes `class` and
      // `className` both — so the pair is told apart by order instead, which
      // the CSS can see perfectly well.
      const plate = (image: typeof light) => ({
        type: "element" as const,
        tagName: "img",
        properties: { ...image.properties },
        children: [],
      });

      ctx.replaceNode(node, {
        type: "element",
        tagName: "p",
        properties: node.properties ?? {},
        children: [
          {
            type: "element",
            tagName: "span",
            properties: { className: ["plate", "plate--themed"] },
            children: [plate(light), plate(dark)],
          },
        ],
      });
    },
  },
};
