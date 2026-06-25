#!/usr/bin/env python3
"""Place a nano-banana generation into its game asset slot.

Usage: place.py <generated_src.png> <dest_rel_path under src/assets>

Mode & size are inferred:
  - cards/* and monsters/* and ui/background.png -> cover (opaque, center-crop)
  - everything else (relics, potions, nodes, characters, ui/player) -> contain
    (rembg cutout -> trim -> fit on transparent canvas)
Target W,H come from scripts/dims_snapshot.json (original asset size).
"""
import sys, json, os
from PIL import Image, ImageOps

src = sys.argv[1]
dest_rel = sys.argv[2]                       # e.g. src/assets/monsters/goblin.png
dest = dest_rel if dest_rel.startswith("src/") else os.path.join("src/assets", dest_rel)

dims = json.load(open(os.path.join(os.path.dirname(__file__), "dims_snapshot.json")))
W, H = dims[os.path.relpath(dest)]

cover = dest.replace("\\", "/").rsplit("src/assets/", 1)[-1]
is_cover = cover.startswith("cards/") or cover.startswith("monsters/") or cover == "ui/background.png"

def trim_solid_border(im):
    """Crop away uniform near-white or near-black solid edges (framed outputs)."""
    g = im.convert("RGB")
    px = g.load()
    w, h = g.size

    def uniform_row(y):
        c = px[0, y]
        if not (all(v > 248 for v in c) or all(v < 8 for v in c)):
            return False
        return all(px[x, y] == c for x in range(0, w, 7))

    def uniform_col(x):
        c = px[x, 0]
        if not (all(v > 248 for v in c) or all(v < 8 for v in c)):
            return False
        return all(px[x, y] == c for y in range(0, h, 7))

    top = 0
    while top < h // 4 and uniform_row(top): top += 1
    bot = h - 1
    while bot > 3 * h // 4 and uniform_row(bot): bot -= 1
    left = 0
    while left < w // 4 and uniform_col(left): left += 1
    right = w - 1
    while right > 3 * w // 4 and uniform_col(right): right -= 1
    if top or left or bot != h - 1 or right != w - 1:
        return im.crop((left, top, right + 1, bot + 1))
    return im

img = Image.open(src).convert("RGBA")
if is_cover:
    img = trim_solid_border(img)
    out = ImageOps.fit(img.convert("RGB"), (W, H), method=Image.LANCZOS, centering=(0.5, 0.42))
    out.save(dest)
    mode = "cover"
else:
    from rembg import remove
    cut = remove(img)
    bbox = cut.getbbox()
    if bbox:
        cut = cut.crop(bbox)
    fitted = ImageOps.contain(cut, (W, H), method=Image.LANCZOS)
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    canvas.paste(fitted, ((W - fitted.width) // 2, (H - fitted.height) // 2), fitted)
    canvas.save(dest)
    mode = "contain"
print(f"OK {dest} {W}x{H} {mode}")
