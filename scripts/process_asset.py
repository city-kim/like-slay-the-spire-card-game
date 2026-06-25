#!/usr/bin/env python3
"""Post-process a nano-banana generation into a game-ready asset.

Usage: process_asset.py <src.png> <dest.png> <mode> <W> <H>
  mode=cover    opaque, center-crop to fill exactly WxH (cards, monsters)
  mode=contain  rembg cutout -> trim -> fit inside WxH on transparent canvas
"""
import sys
from PIL import Image, ImageOps

src, dest, mode, W, H = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
img = Image.open(src).convert("RGBA")

if mode == "cover":
    out = ImageOps.fit(img.convert("RGB"), (W, H), method=Image.LANCZOS, centering=(0.5, 0.42))
    out.save(dest)
elif mode == "contain":
    from rembg import remove
    cut = remove(img)                      # transparent background
    bbox = cut.getbbox()                   # trim to subject
    if bbox:
        cut = cut.crop(bbox)
    fitted = ImageOps.contain(cut, (W, H), method=Image.LANCZOS)
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    canvas.paste(fitted, ((W - fitted.width) // 2, (H - fitted.height) // 2), fitted)
    canvas.save(dest)
else:
    raise SystemExit(f"unknown mode {mode}")
print(f"OK {dest} {W}x{H} {mode}")
