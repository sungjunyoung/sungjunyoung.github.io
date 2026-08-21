#!/usr/bin/env python3
"""Regenerates the 1200x630 social card at public/assets/og/card.gif.

    nix shell --impure --expr \
      'let p = (builtins.getFlake (toString ./.)).inputs.nixpkgs.legacyPackages.aarch64-darwin;
       in p.python3.withPackages (ps: [ ps.pillow ])' \
      --command python3 scripts/make-og-card.py

The card is committed rather than built, so CI needs neither Pillow nor a font.

It is a two frame GIF so the cursor blinks, the same as the header logo. Most
social scrapers show only the first frame, which is why that frame is the one
with the cursor lit — the still fallback still reads as the logo.
"""

import pathlib

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public/assets/og/card.gif"

W, H = 1200, 630
BG = (41, 42, 45)  # --background, dark theme
FG = (233, 233, 238)
ACCENT = (254, 81, 134)  # the logo cursor pink

# Helvetica is the closest system face to the site's Inter. Index 1 is Bold;
# Avenir Next's collection leads with italics, which slants the text.
FONT = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 104, index=1)

TEXT = "sungjunyoung"
# Sits left of centre rather than centred, so the cursor has room to blink
# without the whole block looking off-balance.
X, BASELINE = 150, 262
CURSOR_GAP, CURSOR_W, CURSOR_H = 22, 16, 96


def frame(cursor: bool) -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    draw.text((X, BASELINE), TEXT, font=FONT, fill=FG)

    if cursor:
        left = X + draw.textlength(TEXT, font=FONT) + CURSOR_GAP
        top = BASELINE + 14
        draw.rounded_rectangle(
            (left, top, left + CURSOR_W, top + CURSOR_H), radius=2, fill=ACCENT
        )
    return img


on, off = frame(True), frame(False)
on.save(
    OUT,
    save_all=True,
    append_images=[off],
    duration=[600, 500],
    loop=0,
    optimize=True,
)
print(f"written {OUT} ({OUT.stat().st_size} bytes)")
