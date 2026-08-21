#!/usr/bin/env bash
# Optimises images under public/assets/ before they are committed.
#
# This is an authoring step, NOT part of the build: `pnpm build` copies
# public/ through untouched, and CI installs nothing beyond node and pnpm.
# Running it is only necessary when adding or replacing an image.
#
#   nix shell --impure --expr \
#     'let p = (builtins.getFlake (toString ./.)).inputs.nixpkgs.legacyPackages.aarch64-darwin;
#      in p.buildEnv { name = "img"; paths = [ p.imagemagick p.pngquant p.oxipng p.gifsicle p.libwebp p.jpegoptim ]; }' \
#     --command bash scripts/optimise-images.sh
#
# Astro's dev-toolbar audit flags any <img> whose file is 20KB or larger, so
# that is the number to stay under. The article column is 760px wide, which
# makes 1520px the widest any diagram needs to be for a 2x display.
set -euo pipefail

cd "$(dirname "$0")/.."
MAX_WIDTH=1520
DISPLAY_WIDTH=760

for f in public/assets/**/*.png public/assets/*/*.png; do
  [ -e "$f" ] || continue
  width=$(magick identify -format '%w' "$f")
  if [ "$width" -gt "$MAX_WIDTH" ]; then
    magick "$f" -resize "${MAX_WIDTH}x" -strip "$f"
  fi
  pngquant --quality=65-90 --speed 1 --force --output "$f" "$f"
  oxipng -o 4 --strip safe -q "$f"
done

# Animated GIFs become animated WebP: roughly half the bytes with every frame
# intact. astro:assets is not used for these — it re-encodes a GIF to a still
# WebP and loses the animation.
for f in public/assets/**/*.gif; do
  [ -e "$f" ] || continue
  gifsicle --resize-width "$DISPLAY_WIDTH" "$f" -o "$f.tmp"
  gif2webp -q 80 -m 6 -mixed "$f.tmp" -o "${f%.gif}.webp"
  rm -f "$f.tmp" "$f"
  echo "$f -> ${f%.gif}.webp (update the markdown reference)"
done

for f in public/assets/img/*.jpg; do
  [ -e "$f" ] || continue
  jpegoptim --strip-all --max=72 --quiet "$f"
done

echo
echo "Sizes (audit threshold is 20480 bytes):"
find public/assets -type f \( -name '*.png' -o -name '*.webp' -o -name '*.jpg' \) \
  -exec stat -f '  %8z  %N' {} \; | sort -rn
