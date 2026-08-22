import { SITE } from "../consts";
import { THEME_CHANGE_EVENT, currentTheme } from "./theme";

const GISCUS_ORIGIN = "https://giscus.app";

// giscus accepts a URL in place of a built-in theme name and loads it inside
// its iframe, so the widget can be handed this site's own palette. Only dark
// needs one: giscus's stock `light` is already #24292f on white, within a hair
// of this site's light theme, while every built-in dark theme is built on the
// blue-grey that clashes with #292a2d.
//
// The custom sheet is only reachable on the deployed site. giscus marks its
// theme link `crossorigin="anonymous"`, so the stylesheet needs CORS: GitHub
// Pages sends `Access-Control-Allow-Origin: *`, but Chrome refuses to let
// giscus.app reach a localhost dev server whatever headers it returns (private
// network access), and a blocked sheet leaves the widget unstyled rather than
// falling back. So dev keeps the nearest stock theme instead of showing black
// text on a dark page; the custom palette is verified against the deployed
// site rather than in `astro dev`.
const DARK_THEME_URL = `${SITE.url}/giscus/dark.css`;

const giscusTheme = () => {
  if (currentTheme() !== "dark") return "light";
  return window.location.origin === SITE.url ? DARK_THEME_URL : "dark_dimmed";
};

const container = document.querySelector<HTMLElement>(".comments");

if (container && !container.querySelector("script")) {
  const { giscusRepo, giscusRepoId, giscusCategory, giscusCategoryId } =
    container.dataset;

  const script = document.createElement("script");
  script.src = `${GISCUS_ORIGIN}/client.js`;
  script.async = true;
  script.crossOrigin = "anonymous";
  script.setAttribute("data-repo", giscusRepo ?? "");
  script.setAttribute("data-repo-id", giscusRepoId ?? "");
  script.setAttribute("data-category", giscusCategory ?? "");
  script.setAttribute("data-category-id", giscusCategoryId ?? "");
  // Same per-post key utterances used. `strict=0` keeps the lookup a title
  // search, which is what lets a converted issue still be found even though
  // its title lacks the leading slash of location.pathname.
  script.setAttribute("data-mapping", "pathname");
  script.setAttribute("data-strict", "0");
  script.setAttribute("data-reactions-enabled", "1");
  script.setAttribute("data-emit-metadata", "0");
  script.setAttribute("data-input-position", "bottom");
  // giscus reads `data-theme` once, when client.js runs, so every later change
  // has to be posted to the frame. `data-loading="lazy"` makes that racy: the
  // toggle can happen before giscus is listening, and a message sent into a
  // frame that has not booted is simply lost.
  //
  // The iframe element existing is not the signal to wait for — `contentWindow`
  // is non-null from the moment it is in the DOM, while still on about:blank.
  // The first message giscus posts back is proof that its own script is running,
  // so that is what unblocks sending.
  //
  // `sentTheme` tracks what the frame is actually showing. client.js rebuilds
  // the iframe src from its original `data-theme` when the widget signs out or
  // clears a bad session, so after such a reload the frame reverts to the
  // page-load theme; resetting `sentTheme` on the frame's `load` makes the next
  // message from giscus re-apply whatever the page has settled on.
  let desiredTheme = giscusTheme();
  const initialTheme = desiredTheme;
  let sentTheme = desiredTheme;
  let giscusReady = false;

  script.setAttribute("data-theme", desiredTheme);
  script.setAttribute("data-lang", "ko");
  script.setAttribute("data-loading", "lazy");
  container.appendChild(script);

  const frame = () =>
    container.querySelector<HTMLIFrameElement>("iframe.giscus-frame");

  const sendTheme = () => {
    if (!giscusReady || sentTheme === desiredTheme) return;
    const target = frame()?.contentWindow;
    if (!target) return;
    target.postMessage(
      { giscus: { setConfig: { theme: desiredTheme } } },
      GISCUS_ORIGIN,
    );
    sentTheme = desiredTheme;
  };

  const pushTheme = () => {
    desiredTheme = giscusTheme();
    sendTheme();
  };

  document.addEventListener(THEME_CHANGE_EVENT, pushTheme);
  // Cross-tab: harmless today, because theme.ts does not restyle this document
  // when another tab writes `theme`, so currentTheme() here is unchanged and the
  // push is a no-op. It stays as the hook for when that sync is added.
  window.addEventListener("storage", pushTheme);

  window.addEventListener("message", (event) => {
    if (event.origin !== GISCUS_ORIGIN) return;
    if (!giscusReady) {
      giscusReady = true;
      // client.js can swap the frame's src back to the page-load theme; watch
      // for that so the next message re-applies the current one.
      frame()?.addEventListener("load", () => {
        sentTheme = initialTheme;
      });
    }
    // Flush whatever the page settled on while the frame was still lazy, and
    // re-apply after a reload. A no-op unless the frame is out of date.
    sendTheme();
  });
}
