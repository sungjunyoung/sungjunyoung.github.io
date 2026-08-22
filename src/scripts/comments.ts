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
  // has to be posted into the frame. Two things make that delivery unreliable:
  // `data-loading="lazy"` means the frame may not have booted when the toggle
  // happens, and client.js rebuilds the frame from its original `data-theme`
  // when the widget signs out or clears a bad session.
  //
  // Rather than tracking which frame is live and whether a message landed, the
  // page just re-asserts the theme on every message giscus sends. A message is
  // proof that giscus's own script is running in whatever frame exists at that
  // moment, which covers the lazy boot and any frame it rebuilds later, and
  // `setConfig` with the theme already in effect does nothing. Waiting for the
  // iframe element instead would not work: `contentWindow` is non-null from the
  // moment it is in the DOM, while still on about:blank.
  let theme = giscusTheme();

  script.setAttribute("data-theme", theme);
  script.setAttribute("data-lang", "ko");
  script.setAttribute("data-loading", "lazy");
  container.appendChild(script);

  const sendTheme = () => {
    container
      .querySelector<HTMLIFrameElement>("iframe.giscus-frame")
      ?.contentWindow?.postMessage(
        { giscus: { setConfig: { theme } } },
        GISCUS_ORIGIN,
      );
  };

  const pushTheme = () => {
    theme = giscusTheme();
    sendTheme();
  };

  document.addEventListener(THEME_CHANGE_EVENT, pushTheme);
  // Cross-tab: a no-op today, because theme.ts does not restyle this document
  // when another tab writes `theme`, so giscusTheme() is unchanged. It stays as
  // the hook for when that sync is added.
  window.addEventListener("storage", pushTheme);

  window.addEventListener("message", (event) => {
    if (event.origin === GISCUS_ORIGIN) sendTheme();
  });
}
