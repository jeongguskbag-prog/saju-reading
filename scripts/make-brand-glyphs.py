"""도장(낙관)에 새길 한자를 글꼴에 의존하지 않는 SVG 경로로 뽑는다.

글꼴: Noto Serif CJK KR Bold (SIL Open Font License 1.1). 결과: src/lib/brand/glyphs.ts
실행: python3 scripts/make-brand-glyphs.py [글꼴 경로]
"""
import json
import os
import sys

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTCollection

CHARS = "天機錄壹貳參肆伍等福氣勢中和大器開拓"
path = sys.argv[1] if len(sys.argv) > 1 else "/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc"

font = None
for f in TTCollection(path).fonts:
    names = {n.toUnicode() for n in f["name"].names if n.nameID in (1, 4)}
    if any("KR" in n for n in names):
        font = f
        break
assert font is not None, "Noto Serif CJK KR을 찾지 못했습니다"

cmap = font.getBestCmap()
gs = font.getGlyphSet()
upm = font["head"].unitsPerEm
ascent = font["hhea"].ascent
out = {}
for ch in CHARS:
    name = cmap[ord(ch)]
    pen = SVGPathPen(gs, lambda v: f"{v:.0f}")
    # 글꼴 좌표(위로 증가)를 SVG 좌표(위가 0)로 뒤집는다. 한자 전각 칸은 y=-120~880이므로 880을 위쪽 0으로 맞춰
    # 한 글자가 정확히 1000×1000 칸에 들어가게 한다.
    s = 1000 / upm
    tp = TransformPen(pen, (s, 0, 0, -s, 0, 880 * s))
    gs[name].draw(tp)
    out[ch] = pen.getCommands()

root = os.path.join(os.path.dirname(__file__), "..", "src", "lib", "brand", "glyphs.ts")
with open(root, "w", encoding="utf-8") as fp:
    fp.write("// 자동 생성: python3 scripts/make-brand-glyphs.py — 직접 고치지 마세요.\n")
    fp.write("// Noto Serif CJK KR Bold 글리프 윤곽(SIL Open Font License 1.1). 1000×1000 칸, 위가 0.\n")
    fp.write("export const GLYPHS: Record<string, string> = ")
    fp.write(json.dumps(out, ensure_ascii=False, indent=1))
    fp.write(";\n")
print("ok", {k: len(v) for k, v in out.items()}, "ascent", ascent, "upm", upm, "descent", font["hhea"].descent)
