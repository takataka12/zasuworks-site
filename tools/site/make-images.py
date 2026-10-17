#!/usr/bin/env python3
"""Create web-sized WebP derivatives of the real product screenshots.

Originals are never modified. Run once after replacing a source screenshot:
    python3 tools/site/make-images.py
Outputs go to assets/site/img/ and are committed.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets/site/img"

# name: (source, crop box or None, widths)
SOURCES = {
    "vocal-logic": ("zasu-vocal/assets/logic-pro-v1.0.0.jpg", None, (1536, 960, 640)),
    # Phone photo of a laptop screen: crop to the plugin window only.
    "loud-plugin": ("assets/zasu-loud-v200-live.webp", (0, 300, 1080, 930), (1080, 720)),
    "finish-plugin": ("assets/ui/finish/plugin-rc4.png", None, (1520, 960, 640)),
    "finish-player": ("assets/ui/finish/player-rc4.png", None, (1440, 960)),
    "finish-advanced": ("assets/ui/finish/advanced-rc4.png", None, (1200, 760)),
    "daw-pitch": ("zasu-daw/assets/pitch-editor-v14.png", None, (1600, 960, 640)),
    "daw-tracks": ("zasu-daw/assets/daw.png", None, (1600, 960)),
    "daw-vocal": ("zasu-daw/assets/vocal.png", None, (1600, 960)),
    "daw-harmony": ("zasu-daw/assets/harmony.png", None, (1600, 960)),
    "daw-mix": ("zasu-daw/assets/auto-mix-v14.png", None, (1600, 960)),
    "daw-master": ("zasu-daw/assets/auto-master-v14.png", None, (1600, 960)),
}


# 1200x630 JPEG share images (LINE / X / Facebook previews). Real UI on the console colour, no text.
OG = {
    "og-site": "zasu-vocal/assets/logic-pro-v1.0.0.jpg",
    "og-vocal": "zasu-vocal/assets/logic-pro-v1.0.0.jpg",
    "og-loud": ("assets/zasu-loud-v200-live.webp", (0, 300, 1080, 930)),
    "og-finish": "assets/ui/finish/plugin-rc4.png",
    "og-vocal-editor": "assets/ui/vocal-editor/editor-landscape.avif",
}


def og_images() -> None:
    for name, src in OG.items():
        box = None
        if isinstance(src, tuple):
            src, box = src
        im = Image.open(ROOT / src).convert("RGB")
        if box:
            im = im.crop(box)
        canvas = Image.new("RGB", (1200, 630), (20, 25, 23))
        im.thumbnail((1200 - 96, 630 - 72), Image.LANCZOS)
        canvas.paste(im, ((1200 - im.width) // 2, (630 - im.height) // 2))
        out = OUT / f"{name}.jpg"
        canvas.save(out, "JPEG", quality=85, optimize=True, progressive=True)
        print(f"{out.relative_to(ROOT)}  1200x630  {out.stat().st_size // 1024} KB")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (src, box, widths) in SOURCES.items():
        im = Image.open(ROOT / src).convert("RGB")
        if box:
            im = im.crop(box)
        for w in widths:
            w = min(w, im.width)
            h = round(im.height * w / im.width)
            out = OUT / f"{name}-{w}.webp"
            im.resize((w, h), Image.LANCZOS).save(out, "WEBP", quality=80, method=6)
            print(f"{out.relative_to(ROOT)}  {w}x{h}  {out.stat().st_size // 1024} KB")
    og_images()


if __name__ == "__main__":
    main()
