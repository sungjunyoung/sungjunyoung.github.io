// Copy-the-permalink button in the post layout's left rail.
//
// The address comes from `location.href` at click time rather than from a prop:
// with <ClientRouter /> the document is swapped in place, so a URL baked in at
// build time would be the right one only on the page a visitor first landed on.
const RESTORE_DELAY = 1000;

export function initPostActions(signal: AbortSignal) {
  const button = document.querySelector<HTMLButtonElement>("[data-copy-url]");
  if (!button) return;

  const status = document.querySelector<HTMLElement>("[data-copy-status]");
  let timer: number | undefined;

  const copy = async (text: string) => {
    // Available only over https (or localhost), and a permission or a
    // cross-origin frame can still refuse it.
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // fall through to the selection-based path
      }
    }

    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    // Off-screen but not display:none — a hidden field cannot be selected.
    field.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0";
    document.body.append(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    return copied;
  };

  button.addEventListener(
    "click",
    async () => {
      if (!(await copy(window.location.href))) return;

      button.classList.add("is-copied");
      if (status) status.textContent = "글 주소를 복사했습니다";

      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        button.classList.remove("is-copied");
        if (status) status.textContent = "";
      }, RESTORE_DELAY);
    },
    { signal },
  );

  // A navigation inside the restore delay would otherwise leave a timer holding
  // a button from a document that is no longer on screen.
  signal.addEventListener("abort", () => window.clearTimeout(timer));
}
