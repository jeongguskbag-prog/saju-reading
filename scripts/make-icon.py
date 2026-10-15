"""Android 런처 아이콘: 한지색 원 위에 천기록 낙관. python3 scripts/make-icon.py

낙관 원본은 public/brand/seal-1024.png(사이트와 같은 도장)를 쓴다.
"""
import os

from PIL import Image, ImageDraw

SIZES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
HANJI = (236, 233, 225, 255)
here = os.path.dirname(__file__)
seal = Image.open(os.path.join(here, "..", "public", "brand", "seal-1024.png")).convert("RGBA")
root = os.path.join(here, "..", "android", "res")

S = 768  # 크게 그린 뒤 줄여 계단 현상을 없앤다
base = Image.new("RGBA", (S, S), (0, 0, 0, 0))
ImageDraw.Draw(base).ellipse([S * 0.02, S * 0.02, S * 0.98, S * 0.98], fill=HANJI)
inner = int(S * 0.62)
base.alpha_composite(seal.resize((inner, inner), Image.LANCZOS), ((S - inner) // 2, (S - inner) // 2))

for density, size in SIZES.items():
    out = os.path.join(root, f"mipmap-{density}")
    os.makedirs(out, exist_ok=True)
    base.resize((size, size), Image.LANCZOS).save(os.path.join(out, "ic_launcher.png"))
print("icons written")
