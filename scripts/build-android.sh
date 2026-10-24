#!/usr/bin/env bash
# Android APK 빌드 (Gradle 없이 SDK 명령줄 도구만 사용).
#
# 필요 도구: aapt2, dalvik-exchange(dx) 또는 d8, zipalign, apksigner, javac, keytool
#   Ubuntu: sudo apt-get install aapt dalvik-exchange zipalign apksigner android-sdk-platform-23
#
# 앱은 천기록 웹사이트를 띄우는 WebView 앱이다. 같은 코드로 두 가지 앱을 만든다.
#   관리자용(기본): "천기록 관리". 앱 전용 화면(/app, 결제 없이 무료 풀이)과 관리자 바로가기. 앱 키를 넣는다.
#   사용자용:       "천기록". 일반 홈페이지(/)를 띄우고 결제·카카오 로그인으로 쓴다. 앱 키를 넣지 않는다.
#
# 환경변수:
#   SAJU_AUDIENCE   admin(기본, 관리자용) 또는 user(사용자용, 한국어만).
#                   패키지 이름이 달라(관리자 kr.saju.reading, 사용자 kr.saju.reading.user) 한 기기에 함께 설치된다.
#   SAJU_LOCALE     ko(기본, 한국어 앱 → /app), zh-Hant(대만·홍콩 번체 앱 天機錄 → /app/zh),
#                   zh-Hans(중국 대륙 간체 앱 天机录 → /app/zh-hans).
#                   언어마다 패키지 이름이 달라(kr.saju.reading, .zh, .cn) 한 기기에 함께 설치된다.
#   SAJU_SITE_URL   앱이 띄울 사이트 주소 (기본: https://www.chungirok.com)
#   SAJU_APP_KEY    무료 풀이용 앱 접근 키(16자 이상). Vercel 환경변수 APP_ACCESS_KEY와 같아야 한다.
#                   비우면 앱에서도 명식·등급 계산까지만 보인다.
#   ANDROID_JAR     android.jar 경로 (기본: /usr/lib/android-sdk/platforms/android-23/android.jar)
#   KEYSTORE / KEYSTORE_PASS / KEY_ALIAS   서명 키. 없으면 android/debug.keystore(디버그용)를 만든다.
#   VERSION_CODE / VERSION_NAME
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/android"
OUT="$SRC/build"
ANDROID_JAR="${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}"
SAJU_SITE_URL="${SAJU_SITE_URL:-https://www.chungirok.com}"
SAJU_APP_KEY="${SAJU_APP_KEY:-}"
SAJU_LOCALE="${SAJU_LOCALE:-ko}"
SAJU_AUDIENCE="${SAJU_AUDIENCE:-admin}"
case "$SAJU_AUDIENCE" in
  admin | user) ;;
  *) echo "SAJU_AUDIENCE는 admin(관리자용) 또는 user(사용자용)이어야 합니다." >&2; exit 1 ;;
esac
if [ "$SAJU_AUDIENCE" = user ]; then
  # 사용자용 앱에 앱 키가 들어가면 누구나 결제 없이 감정서를 받을 수 있게 된다.
  [ -z "$SAJU_APP_KEY" ] || { echo "사용자용 앱(SAJU_AUDIENCE=user)에는 SAJU_APP_KEY를 넣을 수 없습니다." >&2; exit 1; }
  [ "$SAJU_LOCALE" = ko ] || { echo "사용자용 앱은 지금 한국어(SAJU_LOCALE=ko)만 만들 수 있습니다." >&2; exit 1; }
fi
case "$SAJU_AUDIENCE:$SAJU_LOCALE" in
  user:ko) APP_PATH="/"; APP_NAME="천기록"; PACKAGE="kr.saju.reading.user"; APK_NAME="Cheongirok.apk" ;;
  admin:ko) APP_PATH="/app"; APP_NAME="천기록 관리"; PACKAGE="kr.saju.reading"; APK_NAME="Cheongirok-admin.apk" ;;
  admin:zh-Hant) APP_PATH="/app/zh"; APP_NAME="天機錄"; PACKAGE="kr.saju.reading.zh"; APK_NAME="saju-reading-zh-hant.apk" ;;
  admin:zh-Hans) APP_PATH="/app/zh-hans"; APP_NAME="天机录"; PACKAGE="kr.saju.reading.cn"; APK_NAME="saju-reading-zh-hans.apk" ;;
  *) echo "SAJU_LOCALE은 ko, zh-Hant, zh-Hans 중 하나여야 합니다." >&2; exit 1 ;;
esac
VERSION_CODE="${VERSION_CODE:-4}"
VERSION_NAME="${VERSION_NAME:-0.3.1}"
KEYSTORE="${KEYSTORE:-$SRC/debug.keystore}"
KEYSTORE_PASS="${KEYSTORE_PASS:-android}"
KEY_ALIAS="${KEY_ALIAS:-saju-debug}"

for tool in aapt2 zipalign apksigner javac keytool; do
  command -v "$tool" >/dev/null || { echo "필요한 도구가 없습니다: $tool" >&2; exit 1; }
done
[ -f "$ANDROID_JAR" ] || { echo "android.jar를 찾을 수 없습니다: $ANDROID_JAR" >&2; exit 1; }

rm -rf "$OUT"
mkdir -p "$OUT/gen/kr/saju/reading" "$OUT/classes"

echo "1/6 사이트 주소 설정: $SAJU_SITE_URL"
case "$SAJU_SITE_URL" in
  https://*) ;;
  *) echo "SAJU_SITE_URL은 https://로 시작해야 합니다." >&2; exit 1 ;;
esac
if [ -z "$SAJU_APP_KEY" ]; then
  echo "  (SAJU_APP_KEY가 없어 AI 풀이 없이 계산 결과만 보이는 앱으로 만듭니다)"
elif ! [[ "$SAJU_APP_KEY" =~ ^[A-Za-z0-9_-]{16,}$ ]]; then
  echo "SAJU_APP_KEY는 영문·숫자·_·- 16자 이상이어야 합니다." >&2; exit 1
fi
cat > "$OUT/gen/kr/saju/reading/SiteConfig.java" <<JAVA
package kr.saju.reading;

/** 빌드 스크립트가 만든다. 앱이 띄울 사이트 주소. */
final class SiteConfig {
    static final String SITE_URL = "${SAJU_SITE_URL%/}";
    static final String APP_KEY = "${SAJU_APP_KEY}";
    static final String APP_PATH = "${APP_PATH}";
    static final String LANG = "${SAJU_LOCALE}";
    /** admin(관리자용) 또는 user(사용자용) */
    static final String AUDIENCE = "${SAJU_AUDIENCE}";

    private SiteConfig() {}
}
JAVA

echo "2/6 리소스 컴파일·링크 ($SAJU_AUDIENCE, $SAJU_LOCALE, $APP_NAME, $PACKAGE)"
# 앱 이름만 언어에 맞게 바꾼 리소스 사본을 쓴다.
cp -r "$SRC/res" "$OUT/res"
sed -i "s#<string name=\"app_name\">[^<]*</string>#<string name=\"app_name\">${APP_NAME}</string>#" "$OUT/res/values/strings.xml"
aapt2 compile --dir "$OUT/res" -o "$OUT/res.zip"
aapt2 link -o "$OUT/unaligned.apk" -I "$ANDROID_JAR" \
  --manifest "$SRC/AndroidManifest.xml" \
  --rename-manifest-package "$PACKAGE" \
  --min-sdk-version 23 --target-sdk-version 34 \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" \
  --java "$OUT/gen" "$OUT/res.zip"

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
  --min-sdk-version 23 --out "$OUT/$APK_NAME" "$OUT/aligned.apk"
apksigner verify "$OUT/$APK_NAME"

echo "완료: $OUT/$APK_NAME ($(du -h "$OUT/$APK_NAME" | cut -f1))"
