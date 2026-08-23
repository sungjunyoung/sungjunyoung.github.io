// Click-to-enlarge for the diagrams in a post.
//
// The text column is 760px and several of the diagrams are wide line art, so
// at reading size the labels inside them are the first thing to go. This gives
// them the viewport.
//
// Built on <dialog>.showModal(): the top layer, the backdrop, the focus trap,
// closing on Escape and restoring focus to the image afterwards are all
// behaviour the element already has, and none of it is worth reimplementing.

/** Images the reader can already do something else with are left alone. */
function isZoomable(image: HTMLImageElement): boolean {
  // A linked image belongs to its link.
  if (image.closest("a")) return false;
  // The about page's profile photo is a 200px circular crop; there is nothing
  // to enlarge, and the round mask makes the zoom affordance look like a bug.
  if (image.closest(".page-about")) return false;
  return true;
}

export function initLightbox(signal: AbortSignal) {
  const content = document.querySelector<HTMLElement>(".post .post-content");
  if (!content) return;

  const images = [
    ...content.querySelectorAll<HTMLImageElement>("img"),
  ].filter(isZoomable);
  if (images.length === 0) return;

  for (const image of images) {
    image.classList.add("zoomable");
    // Announced and reachable as a control, because that is what it now is.
    image.setAttribute("role", "button");
    image.setAttribute("tabindex", "0");
    const label = image.alt.trim();
    image.setAttribute("aria-label", label ? `${label} — 확대` : "이미지 확대");
  }

  let dialog: HTMLDialogElement | null = null;

  const open = (image: HTMLImageElement) => {
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.className = "lightbox";
      dialog.innerHTML =
        '<img class="lightbox__image" alt="" />' +
        '<button type="button" class="lightbox__close" aria-label="닫기"></button>';

      // Anywhere inside closes: the backdrop, the image, the button. There is
      // nothing in here to interact with, so a stray click meaning "put this
      // back" is the only reading available.
      dialog.addEventListener("click", () => dialog?.close());
      // Scrolling the page under a modal is disorienting when the modal is
      // pinned to the viewport, so a wheel or a touch drag dismisses it too.
      dialog.addEventListener("wheel", () => dialog?.close(), {
        passive: true,
      });
      // Appended to the body, which a view transition replaces wholesale —
      // so the dialog leaves with the page that created it.
      document.body.appendChild(dialog);
    }

    const target = dialog.querySelector<HTMLImageElement>(".lightbox__image")!;
    // `currentSrc` is the candidate the browser actually picked out of the
    // srcset astro:assets generated, so the enlarged copy is never a smaller
    // file than the one already on screen.
    target.src = image.currentSrc || image.src;
    target.alt = image.alt;
    // The diagrams are barely wider than the 760px text column, so capping the
    // lightbox at the file's own pixel width would open it at almost the size
    // it already was. It is allowed to upscale instead, up to twice the
    // original — far enough to read the labels inside, and short of the point
    // where a raster drawing turns to mush.
    target.style.setProperty(
      "--lightbox-cap",
      image.naturalWidth ? `${image.naturalWidth * 2}px` : "100vw",
    );
    dialog.showModal();
  };

  content.addEventListener(
    "click",
    (event) => {
      const image = (event.target as HTMLElement).closest?.("img.zoomable");
      if (image instanceof HTMLImageElement) open(image);
    },
    { signal },
  );

  content.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const image = (event.target as HTMLElement).closest?.("img.zoomable");
      if (!(image instanceof HTMLImageElement)) return;
      // Space scrolls the page by default, which is the one thing a reader
      // opening an image does not want.
      event.preventDefault();
      open(image);
    },
    { signal },
  );

  // A navigation started from behind an open dialog would otherwise land on
  // the next page with the modal still in the top layer.
  signal.addEventListener("abort", () => dialog?.close(), { once: true });
}
