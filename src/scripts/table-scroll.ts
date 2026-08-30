// Tables are wrapped in a .table-scroll container at build time (see
// src/markdown/tables.ts). Whether a given container actually scrolls is a
// question only the browser can answer, and the answer changes with the
// viewport, so the two things that depend on it are set here:
//
//   - the fade on the edge that has more table behind it, which is the only
//     hint a reader gets that the table continues past the screen;
//   - a tab stop, so the table can be scrolled from the keyboard. A container
//     that fits does not get one — an outline on something that cannot move is
//     a dead stop in the tab order.
//
// Everything registered here lives on an element inside the body, which a view
// transition replaces wholesale, so none of it needs the page's abort signal.
export function initTableScroll() {
  for (const wrapper of document.querySelectorAll<HTMLElement>(
    ".table-scroll",
  )) {
    const update = () => {
      // Sub-pixel column widths leave a scrollWidth a fraction over the
      // clientWidth on tables that visibly fit; 1px of slack keeps those from
      // claiming a scrollbar that is not there.
      const overflow = wrapper.scrollWidth - wrapper.clientWidth > 1;
      const start = wrapper.scrollLeft > 1;
      const end =
        overflow &&
        wrapper.scrollWidth - wrapper.clientWidth - wrapper.scrollLeft > 1;

      if (overflow) {
        wrapper.tabIndex = 0;
        // Announced as a region so a screen reader user is told the table is
        // scrollable at the point they reach it, rather than finding a stray
        // tab stop. Named, because an unnamed region is skipped.
        wrapper.setAttribute("role", "region");
        wrapper.setAttribute("aria-label", "좌우로 스크롤할 수 있는 표");
      } else {
        wrapper.removeAttribute("tabindex");
        wrapper.removeAttribute("role");
        wrapper.removeAttribute("aria-label");
      }

      const edge = start && end ? "both" : end ? "end" : start ? "start" : null;
      if (edge) wrapper.dataset.overflow = edge;
      else delete wrapper.dataset.overflow;
    };

    update();
    wrapper.addEventListener("scroll", update, { passive: true });

    // Fonts landing after first paint, and any rotation or resize, change the
    // answer; ResizeObserver catches both without a window listener that would
    // then need unbinding.
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(update);
      observer.observe(wrapper);
      const table = wrapper.firstElementChild;
      if (table) observer.observe(table);
    }
  }
}
