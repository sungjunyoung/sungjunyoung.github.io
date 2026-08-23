// Rebuilds hello-friend's "#" permalink beside each heading.
//
// This runs in the browser rather than as a Sätteri plugin because Astro reads
// both heading ids and `headings[].text` from the tree after user plugins have
// run: injecting the anchor there put a literal "#" inside every
// table-of-contents entry, and assigning ids early made github-slugger count
// each heading twice ("intro" became "intro-1").
//
// The "#" is drawn by `.h-anchor::after`, so the element has no text of its
// own. An empty link has no accessible name, hence the explicit aria-label —
// which also makes these genuinely useful to screen reader and keyboard users
// rather than something to hide with aria-hidden.
export function initHeadingAnchors() {
  const headings = document.querySelectorAll<HTMLHeadingElement>(
    '.post-content h1[id], .post-content h2[id], .post-content h3[id], .post-content h4[id], .post-content h5[id], .post-content h6[id]',
  );

  for (const heading of headings) {
    if (heading.querySelector('.h-anchor')) continue;
    // The heading that opens the footnotes section is generated, not written,
    // and it is visually hidden — a permalink to it would be a focus stop
    // pointing at nothing a reader can see.
    if (heading.closest('.footnotes')) continue;

    const anchor = document.createElement('a');
    anchor.className = 'h-anchor';
    anchor.href = `#${encodeURIComponent(heading.id)}`;
    anchor.setAttribute('aria-label', `${heading.textContent?.trim() ?? heading.id} 섹션 링크`);
    heading.appendChild(anchor);
  }
}
