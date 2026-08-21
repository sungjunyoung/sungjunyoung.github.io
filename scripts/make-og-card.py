#!/usr/bin/env python3
"""Regenerates the 1200x630 social card at public/assets/og/default.png.

Run it after changing the profile photo or the site name:

    nix shell --impure --expr \
      'let p = (builtins.getFlake (toString ./.)).inputs.nixpkgs.legacyPackages.aarch64-darwin;
       in p.python3.withPackages (ps: [ ps.pillow ])' \
      --command python3 scripts/make-og-card.py

The card is committed rather than built, so CI needs neither Pillow nor a font.
Text is Latin only, which is why a system face is enough; per-post cards with
Korean titles would need a CJK font shipped in the repo.
"""

import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

W, H = 1200, 630
BG        = (41, 42, 45)      # --background (dark theme)
FG        = (233, 233, 238)
MUTED     = (115, 116, 123)   # --color-secondary
ACCENT    = (254, 81, 134)    # the logo cursor pink

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

# circular profile photo, mirroring the About page treatment
SIZE, CX, CY = 260, 150, (H - 260) // 2
photo = Image.open(str(ROOT / "public/assets/img/profile.jpg")).convert("RGB").resize((SIZE, SIZE), Image.LANCZOS)
mask = Image.new("L", (SIZE * 4, SIZE * 4), 0)
ImageDraw.Draw(mask).ellipse((0, 0, SIZE * 4, SIZE * 4), fill=255)
img.paste(photo, (CX, CY), mask.resize((SIZE, SIZE), Image.LANCZOS))

# Helvetica is the closest system face to the site's Inter.
# Index 0 is Regular, 1 is Bold — Avenir Next's collection leads with the
# italics, which is what slanted the first attempt.
def font(px, weight="Bold"):
    return ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", px,
                              index={"Regular": 0, "Bold": 1}[weight])

x = CX + SIZE + 70
d.text((x, 232), "sungjunyoung", font=font(80, "Bold"), fill=FG)
d.text((x, 336), "blog.sungjunyoung.dev", font=font(32, "Regular"), fill=MUTED)

# the blinking cursor from the site logo, frozen
d.rectangle((x, 396, x + 22, 400), fill=ACCENT)

img.save(str(ROOT / "public/assets/og/default.png"), "PNG", optimize=True)
print("written")
