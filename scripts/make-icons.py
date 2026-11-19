from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / "public" / "icons"
ROOT.mkdir(parents=True, exist_ok=True)


def draw(size: int, pad: float) -> Image.Image:
    image = Image.new("RGB", (size, size), "#5ea33a")
    draw = ImageDraw.Draw(image)
    m = size
    left = int(m * pad)
    right = m - left
    bowl_top = int(m * 0.46)
    draw.rounded_rectangle([left, int(m * 0.18), right, int(m * 0.34)], radius=int(m * 0.08), fill="#8bc34a")
    draw.ellipse([left + int(m * 0.08), bowl_top, right - int(m * 0.08), int(m * 0.84)], fill="#f4f8ef", outline="#245c28", width=max(2, m // 64))
    draw.ellipse([int(m * 0.30), int(m * 0.40), int(m * 0.48), int(m * 0.58)], fill="#e23d3d", outline="#8d2020", width=max(2, m // 90))
    draw.ellipse([int(m * 0.46), int(m * 0.38), int(m * 0.68), int(m * 0.54)], fill="#c6e36a", outline="#2f6b22", width=max(2, m // 90))
    draw.ellipse([int(m * 0.40), int(m * 0.50), int(m * 0.56), int(m * 0.66)], fill="#f2c014", outline="#8a6a00", width=max(2, m // 100))
    nx, ny = int(m * 0.70), int(m * 0.18)
    stem = max(3, m // 48)
    draw.line([(nx, ny + int(m * 0.16)), (nx, ny)], fill="#243024", width=stem)
    draw.ellipse([nx - int(m * 0.07), ny + int(m * 0.1), nx + int(m * 0.02), ny + int(m * 0.18)], fill="#243024")
    return image


draw(192, 0.08).save(ROOT / "icon-192.png")
draw(512, 0.08).save(ROOT / "icon-512.png")
draw(512, 0.18).save(ROOT / "icon-maskable.png")
draw(180, 0.1).save(ROOT / "apple-touch-icon.png")
print("wrote", ROOT)
