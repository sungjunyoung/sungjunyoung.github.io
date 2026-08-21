// Port of hello-friend's assets/js/menu.js, trimmed to the parts this site uses
// (there is no "show more" submenu because the menu holds a single item).
const menu = document.querySelector<HTMLElement>(".menu");
const mobileMenuTrigger = document.querySelector<HTMLElement>(".menu-trigger");
const mobileQuery = getComputedStyle(document.body)
  .getPropertyValue("--phoneWidth")
  .trim();

const isMobile = () => window.matchMedia(mobileQuery).matches;

const syncMenu = () => {
  mobileMenuTrigger?.classList.toggle("hidden", !isMobile());
  menu?.classList.toggle("hidden", isMobile());
};

menu?.addEventListener("click", (e) => e.stopPropagation());

syncMenu();

document.body.addEventListener("click", () => {
  if (isMobile() && menu && !menu.classList.contains("hidden")) {
    menu.classList.add("hidden");
  }
});

window.addEventListener("resize", syncMenu);

mobileMenuTrigger?.addEventListener("click", (e) => {
  e.stopPropagation();
  menu?.classList.toggle("hidden");
});
