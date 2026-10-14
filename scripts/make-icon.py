"""런처 아이콘 생성: 갈색 원 위에 오행 다섯 점. python3 scripts/make-icon.py"""
import math
import os

from PIL import Image, ImageDraw

SIZES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
BG = (122, 75, 42)
RING = (247, 246, 242)
# 목·화·토·금·수 (화면의 오행 색과 동일)
DOTS = [(27, 175, 122), (227, 73, 72), (237, 161, 0), (232, 123, 164), (42, 120, 214)]

root = os.path.join(os.path.dirname(__file__), "..", "android", "res")
for density, size in SIZES.items():
    s = size * 4  # 크게 그린 뒤 줄여 계단 현상을 없앤다
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = s * 0.04
    d.ellipse([pad, pad, s - pad, s - pad], fill=BG)
    c = s / 2
    r_ring = s * 0.27
    d.ellipse([c - r_ring, c - r_ring, c + r_ring, c + r_ring], outline=RING, width=max(2, int(s * 0.025)))
    r_dot = s * 0.085
    for i, color in enumerate(DOTS):
        a = -math.pi / 2 + i * 2 * math.pi / 5
        x, y = c + r_ring * math.cos(a), c + r_ring * math.sin(a)
        d.ellipse([x - r_dot, y - r_dot, x + r_dot, y + r_dot], fill=color, outline=RING, width=max(2, int(s * 0.015)))
    out = os.path.join(root, f"mipmap-{density}")
    os.makedirs(out, exist_ok=True)
    img.resize((size, size), Image.LANCZOS).save(os.path.join(out, "ic_launcher.png"))
print("icons written")
