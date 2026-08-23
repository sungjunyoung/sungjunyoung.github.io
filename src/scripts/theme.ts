// Port of hello-friend's assets/js/theme.js, plus an event so other widgets
// (the giscus iframe) can follow the toggle.
export const THEME_CHANGE_EVENT = "sjy:themechange";

type ThemeClass = "dark-theme" | "light-theme";

export function currentTheme(): "dark" | "light" {
  if (document.body.classList.contains("dark-theme")) return "dark";
  if (document.body.classList.contains("light-theme")) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** The preference Base.astro's inline script reads, resolved the same way. */
function storedTheme(): ThemeClass {
  try {
    const stored = window.localStorage.getItem("theme");
    if (stored === "light-theme" || stored === "dark-theme") return stored;
  } catch {
    /* storage unavailable — fall through to the default */
  }
  return "dark-theme";
}

function applyTheme(theme: ThemeClass) {
  // `dataset.initialTheme` is written as well as the class. Base.astro's body
  // script reads it, and it lives on <html>, which a view transition does not
  // replace — so if that script ever re-runs after a swap it reads the choice
  // in effect rather than the one from the first page load.
  document.documentElement.dataset.initialTheme = theme;
  document.body.classList.toggle("dark-theme", theme === "dark-theme");
  document.body.classList.toggle("light-theme", theme === "light-theme");
}

/**
 * Puts the stored preference back on the body a view transition just replaced.
 * Called from `astro:after-swap`, which runs before the new page is painted.
 */
export function restoreTheme() {
  applyTheme(storedTheme());
}

export function initTheme(signal: AbortSignal) {
  const themeToggle = document.querySelector<HTMLElement>(".theme-toggle");

  themeToggle?.addEventListener(
    "click",
    () => {
      // Base.astro always stamps body with one of the two theme classes before
      // paint, so flipping the current one is enough to know the next.
      const theme: ThemeClass =
        currentTheme() === "dark" ? "light-theme" : "dark-theme";
      applyTheme(theme);

      try {
        window.localStorage.setItem("theme", theme);
      } catch {
        /* storage unavailable — the toggle still works for this page view */
      }

      document.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
    },
    { signal },
  );
}
