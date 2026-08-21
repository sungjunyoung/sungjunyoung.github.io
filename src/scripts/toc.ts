// Highlights the table-of-contents entry for the heading currently in view.
// The active entry is marked with a class; the border comes from CSS.
const toc = document.querySelector<HTMLElement>(".table-of-contents");
if (toc) {
  const links = [...toc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];

  const targets = links
    .map((link) => {
      const id = decodeURIComponent(link.hash.slice(1));
      const heading = document.getElementById(id);
      return heading ? { link, heading } : null;
    })
    .filter(
      (entry): entry is { link: HTMLAnchorElement; heading: HTMLElement } =>
        entry !== null,
    );

  if (targets.length > 0) {
    // A heading counts as "current" once it has passed this line near the top
    // of the viewport, so the highlight tracks what the reader is looking at.
    const ACTIVATION_LINE = 120;

    let active: HTMLAnchorElement | null = null;

    const update = () => {
      let current = targets[0]!;
      for (const entry of targets) {
        if (entry.heading.getBoundingClientRect().top <= ACTIVATION_LINE) {
          current = entry;
        } else {
          break;
        }
      }

      // Once the page is scrolled to the bottom the last heading is the target,
      // even if it never crossed the activation line on a short final section.
      if (
        window.innerHeight + window.scrollY >=
        document.body.scrollHeight - 2
      ) {
        current = targets[targets.length - 1]!;
      }

      if (current.link === active) return;
      active?.classList.remove("active");
      current.link.classList.add("active");
      active = current.link;

      // Keep the highlight visible when the TOC itself has to scroll.
      if (toc.scrollHeight > toc.clientHeight) {
        const linkTop = current.link.offsetTop - toc.offsetTop;
        if (
          linkTop < toc.scrollTop ||
          linkTop > toc.scrollTop + toc.clientHeight - 40
        ) {
          toc.scrollTo({
            top: linkTop - toc.clientHeight / 2,
            behavior: "smooth",
          });
        }
      }
    };

    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        update();
      });
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
  }
}
