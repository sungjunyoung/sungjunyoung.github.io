// Fills the bar at the top of the viewport in step with how much of the
// article has been scrolled past. Measured against the article itself, not the
// document: the header, the pager and the comment box are not reading.
export function initReadingProgress(signal: AbortSignal) {
  const container = document.querySelector<HTMLElement>(".reading-progress");
  const bar = container?.querySelector<HTMLElement>(".reading-progress__bar");
  const content = document.querySelector<HTMLElement>(".post .post-content");

  if (!container || !bar || !content) {
    // Nothing to measure on this page — a list or an error page.
    container?.remove();
    return;
  }

  // Distance from the top of the document, which offsetTop alone does not give
  // once the element sits inside a positioned ancestor.
  const documentTop = (element: HTMLElement) =>
    element.getBoundingClientRect().top + window.scrollY;

  let start = 0;
  let span = 0;

  // Cached because reading layout on every scroll frame forces a reflow; the
  // numbers only change when the page resizes or the content reflows.
  const measure = () => {
    start = documentTop(content);
    // 0% when the article's first line reaches the top of the viewport, 100%
    // when its last line reaches the bottom.
    span = content.offsetHeight - window.innerHeight;
  };

  const update = () => {
    // An article shorter than the viewport is fully read the moment it is on
    // screen, so the bar sits filled rather than stuck at zero.
    const ratio = span > 0 ? (window.scrollY - start) / span : 1;
    const clamped = ratio < 0 ? 0 : ratio > 1 ? 1 : ratio;
    bar.style.transform = `scaleX(${clamped})`;
  };

  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      // A view transition may have swapped this bar out before the frame ran.
      if (signal.aborted) return;
      update();
    });
  };

  const onResize = () => {
    measure();
    update();
  };

  measure();
  update();
  window.addEventListener("scroll", onScroll, { passive: true, signal });
  window.addEventListener("resize", onResize, { signal });
  // Images, embedded code blocks and the comment iframe all land after first
  // paint and move the article's bottom edge with them.
  const observer = new ResizeObserver(onResize);
  observer.observe(content);
  // A ResizeObserver holds its target alive and takes no signal of its own, so
  // it is the one thing here that has to be torn down by hand.
  signal.addEventListener("abort", () => observer.disconnect(), { once: true });
}
