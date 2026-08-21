#!/usr/bin/env python3
"""Regenerates the 1200x630 social cards in public/assets/og/.

    nix shell --impure --expr \
      'let p = (builtins.getFlake (toString ./.)).inputs.nixpkgs.legacyPackages.aarch64-darwin;
       in p.python3.withPackages (ps: [ ps.pillow ])' \
      --command python3 scripts/make-og-card.py

The card is committed rather than built, so CI needs neither Pillow nor a font.

Two files are written from the same drawing:

  card.gif  two frames, so the cursor blinks like the header logo
  card.png  the lit frame alone, for scrapers that skip GIF entirely

Scrapers that cannot animate a GIF generally render its first frame rather than
failing, which is why the lit frame comes first. PNG is the fallback rather than
WebP because several major scrapers still do not accept WebP for og:image.
"""

import pathlib

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT_GIF = ROOT / "public/assets/og/card.gif"
OUT_PNG = ROOT / "public/assets/og/card.png"

W, H = 1200, 630
BG = (41, 42, 45)  # --background, dark theme
FG = (233, 233, 238)
ACCENT = (254, 81, 134)  # the logo cursor pink

# Helvetica is the closest system face to the site's Inter. Index 1 is Bold;
# Avenir Next's collection leads with italics, which slants the text.
FONT_PX = 104
FONT = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", FONT_PX, index=1)

TEXT = "sungjunyoung"
# Sits left of centre rather than centred, so the cursor has room to blink
# without the whole block looking off-balance.
X, TEXT_TOP = 150, 262

# .logo is `display: flex; align-items: center`, so the cursor is a flex item
# centred against the text — not sitting on its baseline. Centring it on the
# font's content box reproduces that: the top lands near the cap height and the
# bottom falls just below the baseline, exactly as the header renders.
ASCENT, DESCENT = FONT.getmetrics()
CURSOR_CENTER = TEXT_TOP + (ASCENT + DESCENT) / 2
# The cursor is the header logo's, scaled. src/styles/logo.css sizes it in
# pixels against an 18px .logo__text, so the ratios are taken from there rather
# than eyeballed — change the CSS and these follow.
LOGO_FONT_PX = 18  # .logo__text: 1.125rem
CURSOR_W = round(10 / LOGO_FONT_PX * FONT_PX)  # .logo__cursor width
CURSOR_H = round(16 / LOGO_FONT_PX * FONT_PX)  # .logo__cursor height: 1rem
CURSOR_GAP = round(5 / LOGO_FONT_PX * FONT_PX)  # .logo__cursor margin-left
CURSOR_RADIUS = round(1 / LOGO_FONT_PX * FONT_PX)  # .logo__cursor border-radius


def frame(cursor: bool) -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    draw.text((X, TEXT_TOP), TEXT, font=FONT, fill=FG)

    if cursor:
        left = X + draw.textlength(TEXT, font=FONT) + CURSOR_GAP
        top = CURSOR_CENTER - CURSOR_H / 2
        draw.rounded_rectangle(
            (left, top, left + CURSOR_W, top + CURSOR_H),
            radius=CURSOR_RADIUS,
            fill=ACCENT,
        )
    return img


on, off = frame(True), frame(False)
on.save(
    OUT_GIF,
    save_all=True,
    append_images=[off],
    duration=[500, 500],
    loop=0,
    optimize=True,
)
on.save(OUT_PNG, "PNG", optimize=True)

for path in (OUT_GIF, OUT_PNG):
    print(f"written {path.relative_to(ROOT)} ({path.stat().st_size} bytes)")
