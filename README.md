# blog.sungjunyoung.dev

Personal blog, built with [Astro](https://astro.build).

## Develop

Dependencies are pinned with Nix and loaded automatically by [direnv](https://direnv.net):

```sh
direnv allow      # once, then the dev shell loads on cd
pnpm install
pnpm dev          # http://localhost:4321
```

Without direnv, `nix develop` gives the same shell.

| Command        | Description                     |
| -------------- | ------------------------------- |
| `pnpm dev`     | Dev server with hot reload      |
| `pnpm build`   | Static build to `./dist`        |
| `pnpm preview` | Serve the built output          |
| `pnpm check`   | Type-check `.astro`/`.ts` files |
| `pnpm format`  | Prettier                        |

## Writing

Posts live in `src/content/posts/*.md`. Frontmatter:

```yaml
---
title: "제목"
date: 2026-08-22T00:00:00+09:00
draft: false
tags: [golang]
---
```

Drafts are shown by `pnpm dev` and excluded from `pnpm build`. Post images go in
`public/assets/posts/<slug>/` and are referenced by absolute path.

## Deploy

Pushing to `master` builds and publishes to GitHub Pages via
`.github/workflows/deploy.yml`. The custom domain (`blog.sungjunyoung.dev`) is held by `public/CNAME`.

## Layout

```
src/
  components/   header, footer, post card, TOC
  content/      posts (Astro content collection)
  layouts/      Base (shell), Page (standalone markdown pages)
  markdown/     Sätteri plugins: emoji shortcodes, heading anchors
  pages/        routes — /, /posts/…, /tags/…, /about/, /index.xml
  scripts/      theme toggle, mobile menu, code copy button
  styles/       design ported from the hugo-theme-hello-friend
public/         static files served as-is
```
