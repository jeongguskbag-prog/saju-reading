#!/usr/bin/env bash
# Android APK 빌드 (Gradle 없이 SDK 명령줄 도구만 사용).
#
# 필요 도구: aapt2, dalvik-exchange(dx) 또는 d8, zipalign, apksigner, javac, keytool
#   Ubuntu: sudo apt-get install aapt dalvik-exchange zipalign apksigner android-sdk-platform-23
#
# 환경변수:
#   SAJU_API_BASE   AI 풀이를 요청할 웹 서버 주소 (예: https://saju.vercel.app). 비우면 계산 결과만 표시.
#   ANDROID_JAR     android.jar 경로 (기본: /usr/lib/android-sdk/platforms/android-23/android.jar)
#   KEYSTORE / KEYSTORE_PASS / KEY_ALIAS   서명 키. 없으면 android/debug.keystore(디버그용)를 만든다.
#   VERSION_CODE / VERSION_NAME
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/android"
OUT="$SRC/build"
ANDROID_JAR="${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}"
SAJU_API_BASE="${SAJU_API_BASE:-}"
VERSION_CODE="${VERSION_CODE:-1}"
VERSION_NAME="${VERSION_NAME:-0.1.0}"
KEYSTORE="${KEYSTORE:-$SRC/debug.keystore}"
KEYSTORE_PASS="${KEYSTORE_PASS:-android}"
KEY_ALIAS="${KEY_ALIAS:-saju-debug}"

for tool in aapt2 zipalign apksigner javac keytool; do
  command -v "$tool" >/dev/null || { echo "필요한 도구가 없습니다: $tool" >&2; exit 1; }
done
[ -f "$ANDROID_JAR" ] || { echo "android.jar를 찾을 수 없습니다: $ANDROID_JAR" >&2; exit 1; }

rm -rf "$OUT"
mkdir -p "$OUT/assets/www" "$OUT/gen" "$OUT/classes"

echo "1/6 웹 화면 번들"
cd "$ROOT"
npx esbuild mobile/main.tsx --bundle --minify --format=iife --target=chrome80 \
  --jsx=automatic --define:process.env.NODE_ENV='"production"' \
  --define:SAJU_API_BASE="\"$SAJU_API_BASE\"" \
  --outfile="$OUT/assets/www/app.js" --log-level=warning
cp src/app/globals.css "$OUT/assets/www/app.css"
cat > "$OUT/assets/www/index.html" <<'HTML'
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>사주 풀이</title>
<link rel="stylesheet" href="app.css">
</head>
<body>
<div id="root"></div>
<script src="app.js"></script>
</body>
</html>
HTML

echo "2/6 리소스 컴파일·링크"
aapt2 compile --dir "$SRC/res" -o "$OUT/res.zip"
aapt2 link -o "$OUT/unaligned.apk" -I "$ANDROID_JAR" \
  --manifest "$SRC/AndroidManifest.xml" \
  --min-sdk-version 23 --target-sdk-version 34 \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" \
  -A "$OUT/assets" --java "$OUT/gen" "$OUT/res.zip"

echo "3/6 Java 컴파일"
javac -nowarn -Xlint:-options --release 8 -encoding UTF-8 -cp "$ANDROID_JAR" -d "$OUT/classes" \
  $(find "$SRC/src" "$OUT/gen" -name '*.java')

echo "4/6 DEX 변환"
if command -v d8 >/dev/null; then
  d8 --release --min-api 23 --lib "$ANDROID_JAR" --output "$OUT" $(find "$OUT/classes" -name '*.class')
else
  dalvik-exchange --dex --min-sdk-version=23 --output="$OUT/classes.dex" "$OUT/classes"
fi
(cd "$OUT" && zip -q -j unaligned.apk classes.dex)

echo "5/6 정렬"
zipalign -f -p 4 "$OUT/unaligned.apk" "$OUT/aligned.apk"

echo "6/6 서명"
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -keystore "$KEYSTORE" -storepass "$KEYSTORE_PASS" -keypass "$KEYSTORE_PASS" \
    -alias "$KEY_ALIAS" -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=Saju Debug, O=Saju, C=KR" >/dev/null 2>&1
fi
apksigner sign --ks "$KEYSTORE" --ks-pass "pass:$KEYSTORE_PASS" --ks-key-alias "$KEY_ALIAS" \
  --min-sdk-version 23 --out "$OUT/saju-reading.apk" "$OUT/aligned.apk"
apksigner verify "$OUT/saju-reading.apk"

echo "완료: $OUT/saju-reading.apk ($(du -h "$OUT/saju-reading.apk" | cut -f1))"
