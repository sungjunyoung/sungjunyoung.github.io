// hello-friend used Prism's copy-to-clipboard plugin. Astro highlights with
// Prism at build time, so the toolbar is re-created here with the same markup
// and classes the old stylesheet expects.
//
// Every listener sits on an element inside the body, which a view transition
// replaces wholesale, so nothing here needs the page's abort signal.
export function initCodeCopy() {
  for (const pre of document.querySelectorAll<HTMLPreElement>(
    'pre[class*="language-"]',
  )) {
    if (pre.parentElement?.classList.contains("code-toolbar")) continue;

    const wrapper = document.createElement("div");
    wrapper.className = "code-toolbar";
    pre.replaceWith(wrapper);
    wrapper.appendChild(pre);

    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";

    const item = document.createElement("div");
    item.className = "toolbar-item";

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Copy";
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pre.innerText);
        button.textContent = "Copied!";
      } catch {
        button.textContent = "Failed";
      }
      setTimeout(() => (button.textContent = "Copy"), 2000);
    });

    item.appendChild(button);
    toolbar.appendChild(item);
    wrapper.appendChild(toolbar);
  }
}
