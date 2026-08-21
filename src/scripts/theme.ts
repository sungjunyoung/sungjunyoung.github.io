// Port of hello-friend's assets/js/theme.js, plus an event so other widgets
// (the utterances iframe) can follow the toggle.
export const THEME_CHANGE_EVENT = "sjy:themechange";

export function currentTheme(): "dark" | "light" {
  if (document.body.classList.contains("dark-theme")) return "dark";
  if (document.body.classList.contains("light-theme")) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

const themeToggle = document.querySelector<HTMLElement>(".theme-toggle");

themeToggle?.addEventListener("click", () => {
  // Base.astro always stamps body with one of the two theme classes before
  // paint, so flipping both is enough.
  document.body.classList.toggle("light-theme");
  document.body.classList.toggle("dark-theme");

  try {
    window.localStorage.setItem("theme", `${currentTheme()}-theme`);
  } catch {
    /* storage unavailable — the toggle still works for this page view */
  }

  document.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
});
