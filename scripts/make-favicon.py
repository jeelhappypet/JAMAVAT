"""
Rebuilds public/favicon.ico from public/icons/favicon-192.png.

    python3 scripts/make-favicon.py        # needs Pillow (pip install pillow)

One .ico with every size a browser tab or a search result might ask for.
Google shows a site's favicon only when it is a square whose side is a
multiple of 48, and it reads one file per site — the 16/32/48 .ico this
replaced gave it nothing bigger than 48 to work with. The source is the
opaque square with the mark inset (not the transparent PWA icon), because
Google draws the icon in a circle on both light and dark results.

Re-run it only when the brand mark changes; the output is committed.
"""

from PIL import Image

SOURCE = "public/icons/favicon-192.png"
OUT = "public/favicon.ico"
# 192 is the source's own size — nothing here is upscaled.
SIZES = [(16, 16), (32, 32), (48, 48), (64, 64), (96, 96), (128, 128), (192, 192)]

mark = Image.open(SOURCE).convert("RGBA")
if mark.size != (192, 192):
    raise SystemExit(f"{SOURCE} should be 192x192, found {mark.size}")

# Pillow builds every entry from this one image; `append_images` is for other formats.
mark.save(OUT, format="ICO", sizes=SIZES)
mark.resize((96, 96), Image.LANCZOS).save("public/icons/favicon-96.png", format="PNG", optimize=True)
print(f"{OUT}: {', '.join(f'{w}x{h}' for w, h in SIZES)}")
