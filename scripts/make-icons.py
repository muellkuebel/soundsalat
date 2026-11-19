"""Rasterize public/icon.svg into the PWA icon sizes."""

from pathlib import Path

import cairosvg

ROOT = Path(__file__).resolve().parents[1]
SVG = (ROOT / "public" / "icon.svg").read_text()
ICONS = ROOT / "public" / "icons"
ICONS.mkdir(parents=True, exist_ok=True)

# Keep the favicon identical to the source artwork.
(ROOT / "public" / "favicon.svg").write_text(SVG)


def png(svg: str, size: int, dest: Path) -> None:
    cairosvg.svg2png(bytestring=svg.encode(), write_to=str(dest), output_width=size, output_height=size)


def maskable(size: int = 512) -> str:
    # Keep the leaf and note inside the center 66% so a circular mask does not crop them.
    inner = SVG.replace("<svg ", '<svg x="87" y="87" width="338" height="338" ', 1)
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">'
        '<rect width="512" height="512" fill="#f4f8ef"/>'
        f"{inner}</svg>"
    )


png(SVG, 192, ICONS / "icon-192.png")
png(SVG, 512, ICONS / "icon-512.png")
png(maskable(), 512, ICONS / "icon-maskable.png")
png(SVG, 180, ICONS / "apple-touch-icon.png")
print("wrote", ICONS)
