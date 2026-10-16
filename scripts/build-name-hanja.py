"""작명에 쓰는 한자 자료를 만든다. 결과: src/lib/naming/hanja-data.json

자료
- Unihan(유니코드 컨소시엄, Unicode License v3): kHangul(한국어 음과 출처 표시), kRSUnicode(강희 부수·나머지 획수)
  받는 곳: https://github.com/unicode-org/unicodetools 의 unicodetools/data/ucd/dev/Unihan/
  kHangul 출처 표시 중 E(교육용 기초한자)·N(인명용 한자)가 붙은 음만 이름에 쓸 수 있는 음으로 본다.
- data/naming/name-hanja.tsv: 천기록이 엄선한 이름 추천 한자(뜻·성별·느낌 태그)

원획(原劃): 부수의 원래 글자 획수 + 나머지 획수. 예) 浩 = 水(4) + 告(7) = 11. 숫자 한자는 수의 값으로 센다.
자원오행: 부수 기준표(RADICAL_ELEMENT). 표에 없는 부수는 이름 추천 한자에서 직접 정한 값(엄선표에 없으면 빈 값).

실행: python3 scripts/build-name-hanja.py <Unihan 폴더>
"""
import json
import os
import sys

UNIHAN = sys.argv[1] if len(sys.argv) > 1 else "Unihan"
ROOT = os.path.join(os.path.dirname(__file__), "..")

# 강희 부수 214개의 원래 획수(1번 一 ~ 214번 龠)
RAD_STROKES = [1] * 6 + [2] * 23 + [3] * 31 + [4] * 34 + [5] * 23 + [6] * 29 + [7] * 20 + [8] * 9 + [9] * 11 + [10] * 8 + [11] * 6 + [12] * 4 + [13] * 4 + [14] * 2 + [15] + [16] * 2 + [17]
assert len(RAD_STROKES) == 214

# 숫자 한자는 수의 값을 획수로 쓴다(원획법 관례).
NUMERAL = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10}

# 부수 → 자원오행(천기록 기준표). 뜻이 분명한 부수만 정하고, 나머지는 엄선표 값 또는 빈 값.
W, F, E, M, A = "wood", "fire", "earth", "metal", "water"
RADICAL_ELEMENT = {
    # 木
    75: W, 140: W, 118: W, 115: W, 119: W, 120: W, 200: W, 97: W, 199: W, 202: W, 45: W, 40: W, 53: W, 100: W,
    # 火
    86: F, 72: F, 73: F, 155: F, 61: F, 9: F, 10: F, 60: F, 106: F, 109: F, 147: F, 181: F, 186: F, 196: F, 201: F, 203: F,
    # 土
    32: E, 33: E, 46: E, 102: E, 170: E, 163: E, 38: E, 19: E, 157: E, 156: E, 116: E, 44: E, 101: E, 105: E, 110: E, 165: E,
    # 金
    167: M, 96: M, 112: M, 18: M, 62: M, 154: M, 69: M, 149: M, 145: M, 171: M, 180: M, 123: M, 124: M, 79: M, 113: M, 161: M, 166: M,
    # 水
    85: A, 15: A, 173: A, 195: A, 39: A, 74: A, 164: A, 30: A, 47: A, 70: A, 117: A, 41: A, 176: A, 151: A,
}

# 부수 기준표로 정해지지 않는 엄선 한자의 자원오행(글자 뜻과 작명 관례 기준).
ELEMENT_OVERRIDE = {
    "舒": F, "知": M, "敏": M, "民": F, "駿": F, "友": A, "胤": A, "夏": F, "延": E, "衍": A, "雅": F, "叡": F,
    "道": E, "振": W, "遠": E, "承": W, "丞": W, "才": W, "載": F, "聖": F, "盛": F, "建": W, "乾": M, "太": W,
    "正": E, "廷": W, "靜": W, "彩": F, "多": A, "麟": E, "希": W, "京": E, "敬": M, "奎": E, "揆": W, "彬": W,
    "斌": W, "尙": M, "亨": E, "輔": F, "雄": F, "益": A, "彰": F, "弼": F, "軒": E, "弘": E, "輝": F, "冠": W,
    "九": A, "國": A, "南": F, "年": W, "達": E, "良": E, "萬": W, "武": M, "文": W, "博": A, "奉": W, "世": F,
    "彦": F, "典": M, "中": E, "天": F, "致": E, "卓": W, "平": W, "享": E, "協": A, "厚": E, "興": E,
}


def ranges(path):
    """'4E00..4E01<TAB>값' 또는 '4E00<TAB>값' 줄을 (코드포인트, 값)으로 펼친다."""
    with open(path, encoding="utf-8") as fp:
        for line in fp:
            if not line.strip() or line.startswith("#"):
                continue
            cp, val = line.rstrip("\n").split("\t")[:2]
            cp = cp.replace("U+", "")
            if ".." in cp:
                a, b = (int(x, 16) for x in cp.split(".."))
            else:
                a = b = int(cp, 16)
            for c in range(a, b + 1):
                yield chr(c), val

def dueum(syl):
    """두음법칙 형태(이름 첫 글자 등): 련→연, 리→이, 라→나, 녀→여."""
    code = ord(syl) - 0xAC00
    if not 0 <= code < 11172:
        return syl
    cho, jung, jong = code // 588, (code % 588) // 28, code % 28
    Y = {2, 3, 6, 7, 12, 17, 20}  # ㅑ ㅒ ㅕ ㅖ ㅛ ㅠ ㅣ
    if cho == 5:  # ㄹ
        cho = 11 if jung in Y else 2  # ㅇ 또는 ㄴ
    elif cho == 2 and jung in Y:  # ㄴ
        cho = 11
    return chr(0xAC00 + cho * 588 + jung * 28 + jong)


readings = {}
for ch, val in ranges(os.path.join(UNIHAN, "kHangul.txt")):
    allowed = []
    for item in val.split():
        r, _, src = item.partition(":")
        if "E" in src or "N" in src:
            # 인명용 한자는 두음법칙에 따라 바뀐 음으로도 쓸 수 있다(예: 蓮 련·연).
            for x in (r, dueum(r)):
                if x not in allowed:
                    allowed.append(x)
    if allowed:
        readings[ch] = allowed

rs = {}
for ch, val in ranges(os.path.join(UNIHAN, "kRSUnicode.txt")):
    first = val.split()[0]
    rad, _, rest = first.partition(".")
    rs[ch] = (int(rad.rstrip("'!")), int(rest))

def strokes(ch):
    if ch in NUMERAL:
        return NUMERAL[ch]
    rad, rest = rs[ch]
    return RAD_STROKES[rad - 1] + rest

curated = {}
errors = []
with open(os.path.join(ROOT, "data", "naming", "name-hanja.tsv"), encoding="utf-8") as fp:
    for line in fp:
        if not line.strip() or line.startswith("#"):
            continue
        ch, reading, meaning, gender, tags = line.rstrip("\n").split("\t")
        if ch in curated:
            continue
        if reading not in readings.get(ch, []):
            errors.append(f"{ch}: '{reading}'은(는) 인명용 음이 아님 (가능: {readings.get(ch)})")
            continue
        curated[ch] = {"r": reading, "m": meaning, "g": gender, "t": [t for t in tags.split(",") if t]}

if errors:
    print("\n".join(errors))
    sys.exit(1)

out = {}
for ch, rlist in readings.items():
    if ch not in rs:
        continue
    rad = rs[ch][0]
    entry = {"r": rlist, "s": strokes(ch), "e": ELEMENT_OVERRIDE.get(ch) or RADICAL_ELEMENT.get(rad, "")}
    if ch in curated:
        c = curated[ch]
        entry.update({"n": c["r"], "m": c["m"], "g": c["g"], "t": c["t"]})
    out[ch] = entry

missing_el = [ch for ch in curated if not out[ch]["e"]]
dest = os.path.join(ROOT, "src", "lib", "naming", "hanja-data.json")
with open(dest, "w", encoding="utf-8") as fp:
    json.dump(out, fp, ensure_ascii=False, separators=(",", ":"))
print(f"ok: 인명용 한자 {len(out)}자, 엄선 {len(curated)}자, 자원오행 미정 엄선 {len(missing_el)}자: {''.join(missing_el)}")
