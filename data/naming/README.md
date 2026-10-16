# 작명 한자 자료

- `name-hanja.tsv`: 천기록이 엄선한 이름 추천 한자(뜻·성별·느낌 태그).
- `src/lib/naming/hanja-data.json`: `scripts/build-name-hanja.py`가 만든 결과(인명용 한자 8천여 자의 음·원획·자원오행 + 엄선 정보).

Unihan 자료(kHangul, kRSUnicode)는 유니코드 컨소시엄의 Unicode Data Files이며 Unicode License v3를 따릅니다.
Copyright © 1991-2026 Unicode, Inc. https://www.unicode.org/license.txt

다시 만들기:

```sh
git clone --depth 1 --filter=blob:none --sparse https://github.com/unicode-org/unicodetools ut
cd ut && git sparse-checkout set --no-cone /unicodetools/data/ucd/dev/Unihan/kHangul.txt /unicodetools/data/ucd/dev/Unihan/kRSUnicode.txt && cd ..
python3 scripts/build-name-hanja.py ut/unicodetools/data/ucd/dev/Unihan
```
