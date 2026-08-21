// Rebuilds hello-friend's "#" permalink beside each heading.
//
// This runs in the browser rather than as a Sätteri plugin because Astro reads
// both heading ids and `headings[].text` from the tree after user plugins have
// run: injecting the anchor there put a literal "#" inside every
// table-of-contents entry, and assigning ids early made github-slugger count
// each heading twice ("intro" became "intro-1"). The anchor is decorative and
// aria-hidden, so building it client-side costs nothing.
const headings = document.querySelectorAll<HTMLHeadingElement>(
  '.post-content h1[id], .post-content h2[id], .post-content h3[id], .post-content h4[id], .post-content h5[id], .post-content h6[id]',
);

for (const heading of headings) {
  if (heading.querySelector('.h-anchor')) continue;

  const anchor = document.createElement('a');
  anchor.className = 'h-anchor';
  anchor.href = `#${encodeURIComponent(heading.id)}`;
  anchor.setAttribute('aria-hidden', 'true');
  anchor.tabIndex = -1;
  heading.appendChild(anchor);
}
