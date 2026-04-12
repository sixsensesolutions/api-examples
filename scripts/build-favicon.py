#!/usr/bin/env python3
"""Build Six Sense favicon assets.

Creates:
- docs/favicon.svg (always)
- docs/favicon.png and docs/favicon.ico (when Pillow is available)
"""

from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DOCS_DIR = ROOT / "docs"
SVG_PATH = DOCS_DIR / "favicon.svg"
PNG_PATH = DOCS_DIR / "favicon.png"
ICO_PATH = DOCS_DIR / "favicon.ico"

BG = "#0a0a0a"
FG = "#2dd4bf"


SVG_CONTENT = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#0a0a0a"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle"
        font-family="monospace" font-weight="bold" font-size="13" fill="#2dd4bf">6S</text>
</svg>
"""


def write_svg() -> None:
  SVG_PATH.write_text(SVG_CONTENT, encoding="utf-8")


def write_raster_with_pillow() -> bool:
  try:
    from PIL import Image, ImageDraw, ImageFont
  except Exception:
    return False

  image = Image.new("RGBA", (32, 32), BG)
  draw = ImageDraw.Draw(image)
  try:
    font = ImageFont.truetype("DejaVuSansMono-Bold.ttf", 16)
  except Exception:
    font = ImageFont.load_default()

  text = "6S"
  bbox = draw.textbbox((0, 0), text, font=font)
  text_w = bbox[2] - bbox[0]
  text_h = bbox[3] - bbox[1]
  x = (32 - text_w) // 2
  y = (32 - text_h) // 2 - 1
  draw.text((x, y), text, fill=FG, font=font)

  image.save(PNG_PATH, format="PNG")
  image.save(ICO_PATH, format="ICO", sizes=[(32, 32)])
  return True


def main() -> None:
  DOCS_DIR.mkdir(parents=True, exist_ok=True)
  write_svg()
  wrote_raster = write_raster_with_pillow()
  if wrote_raster:
    print(f"Created {SVG_PATH}, {PNG_PATH}, and {ICO_PATH}")
  else:
    print(f"Created {SVG_PATH}. Pillow not available, skipped PNG/ICO.")


if __name__ == "__main__":
  main()
