// The one entry point Base.astro loads.
//
// With <ClientRouter /> a navigation swaps the document instead of reloading
// it, so a widget that does its work at module scope only ever runs on the
// first page a visitor lands on. Every script here exports an initialiser
// instead, and this module runs them again after each swap. `astro:page-load`
// fires on the very first load too, so there is no separate boot path.
//
// Each initialiser is handed an AbortSignal that fires just before the next
// swap. Listeners on `window` and `document` outlive the swap — only the body
// is replaced — so registering them with `{ signal }` is what keeps a five-page
// visit from ending with five scroll handlers on the same window.
import { initTheme, restoreTheme } from "./theme";
import { initCodeCopy } from "./code-copy";
import { initPostActions } from "./post-actions";
import { initHeadingAnchors } from "./heading-anchors";
import { initToc } from "./toc";
import { initReadingProgress } from "./reading-progress";
import { initLightbox } from "./lightbox";
import { initComments } from "./comments";
import "./mixpanel";

// Neither analytics library is driven from here, and that is deliberate.
// Mixpanel patches history.pushState itself (see mixpanel.ts), and GA4's
// enhanced measurement listens for the same history change — so a page view
// sent from `astro:page-load` as well would be counted twice on every
// navigation where GA's own listener fires. Measured: it fires for most SPA
// navigations but not all, which is a known cost of the swap rather than
// something this file can fix; making it exact means turning off "page
// changes based on browser history events" in the GA4 property first.

type PageInit = (signal: AbortSignal) => void;

const INITS: PageInit[] = [
  initTheme,
  initCodeCopy,
  initPostActions,
  initHeadingAnchors,
  initToc,
  initReadingProgress,
  initLightbox,
  initComments,
];

let controller: AbortController | null = null;

document.addEventListener("astro:before-swap", () => {
  controller?.abort();
  controller = null;
});

// The swapped-in body carries whatever theme class the server rendered, which
// is the default rather than the visitor's choice. This runs before paint, so
// a reader who picked the light theme never sees a frame of the dark one.
document.addEventListener("astro:after-swap", restoreTheme);

document.addEventListener("astro:page-load", () => {
  controller = new AbortController();
  const { signal } = controller;

  for (const init of INITS) {
    // One widget failing is not a reason for the rest of the page to stay
    // inert — without this, a throw in the first initialiser would leave the
    // copy buttons and the comments unbound.
    try {
      init(signal);
    } catch (error) {
      console.error(error);
    }
  }
});
