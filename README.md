# 천기록(天機錄) — 100년 종합사주

> 브랜드: 천기록. 디자인은 쪽빛 고서 표지 · 닥종이 한지 · 먹 · 인주(붉은 도장) 콘셉트이며, 제목 글꼴은 송명(Song Myung)입니다.
> 첫 화면은 판매용 랜딩 페이지(`src/components/Landing.tsx`)이고, 그 아래에 사주 입력 폼이 있습니다. 브랜드명·상품명·가격·판매 여부는 `src/lib/product.ts`에서 바꿉니다.

## 브랜드 자산

- 낙관(도장) 로고: `src/components/BrandSeal.tsx` — 天機錄을 글꼴이 아닌 도형 경로로 그려 어느 기기·PDF에서나 같은 모양. 글자 경로는 `python3 scripts/make-brand-glyphs.py`로 만든다(Noto Serif CJK KR Bold, OFL).
- 이미지 파일: `public/brand/`(낙관 1024px, 가로형 로고, 정사각 로고), `src/app/icon.png`·`apple-icon.png`(파비콘), `src/app/opengraph-image.png`(카톡·문자 공유 미리보기 1200×630)
- 안드로이드 앱 아이콘: `python3 scripts/make-icon.py`(낙관을 한지색 원 위에 얹음)
- 공유 미리보기 이미지 주소는 `SITE_URL`(없으면 Vercel 실제 사이트 주소) 기준

## 상담

- 홈 오른쪽 아래 '카톡 상담' 버튼, 홈의 '도움이 필요하신가요?' 칸, 구매 상자 아래에 카카오톡 1:1 상담과 이메일 문의(`BUSINESS.email`)
- 카톡 상담 주소: Vercel 환경변수 `NEXT_PUBLIC_KAKAO_CHANNEL_URL`(예: `https://pf.kakao.com/_AbCdE`) 또는 `src/lib/product.ts`의 `SUPPORT`. 비어 있으면 카톡 버튼은 숨고 이메일만 보인다

## 약관·사업자 정보

- `/terms`(이용약관), `/privacy`(개인정보처리방침), `/refund`(환불 규정). 모든 화면 하단에 링크와 사업자 정보 표시
- 사업자 정보는 `src/lib/product.ts`의 `BUSINESS`에 채운다. 빈 칸은 "등록 예정"으로 보인다
- 약관 문안은 서비스 실제 동작(저장 항목·보관 기간·국외 이전)에 맞춘 초안이다. 정식 판매 전 전문가 검토 권장

## 상품

`src/lib/product.ts`의 `PRODUCTS`에서 이름·가격·담는 파트를 바꾼다.

| 상품 | 가격 | 담는 파트 |
| --- | --- | --- |
| 천기록 핵심 명식록 | 29,000원 | 발간사, 1부(천명), 5부(세운·개운법) |
| 천기록 종합 감정서 | 49,000원 | 발간사, 1~5부 전체 |
| 길운 개운 작명록 | 70,000원 | 준비 중(`available: false`) |

- 감정서 링크는 결제일로부터 `REPORT_VALID_DAYS`(30)일 동안 열린다. 지나면 "열람 기간이 지났습니다" 안내, 풀이는 하루 뒤 저장소에서 자동 삭제
- 결제 직후 서버가 감정서 전체를 끝까지 쓰고(손님이 창을 닫아도), 다 쓰면 완성 메일(Resend)을 한 번 보낸다
- PDF 표지: 쪽빛 고서 표지 + 이중 테두리 + 天機錄 + 의뢰인 명식 카드 + 낙관 직인

## 판매 흐름

1. 생년월일시 입력 → **무료**: 명식, 등급·희소도, 오행·대운 그래프
2. 등급 카드 아래 구매 상자: 이메일 + 청약철회 제한 동의 → `POST /api/orders`(서버가 가격으로 주문 생성) → 토스페이먼츠 결제창(v2 SDK)
3. 결제 성공 → `/pay/success`에서 금액 대조 후 토스 승인 API 호출 → 리포트 토큰 발급 → (설정 시) 메일 발송 → `/r/{토큰}`
4. `/r/{토큰}`: 다섯 부 AI 풀이를 쓰고 저장. 다시 열면 저장된 풀이를 그대로 보여 줌(AI 비용 재발생 없음). 검색 노출 안 함
5. 실패·취소 → `/pay/fail`
6. 휴대폰에서 다른 앱으로 넘어가 연결이 끊겨도, 리포트 화면이 자동으로 다시 연결해 저장된 풀이를 받아 온다
7. PDF로 저장할 때는 우리 화면(`#app-root`) 밖에 끼워 넣어진 요소(휴대폰 앱의 떠 있는 버튼 등)를 넣지 않는다

결제 수단: 기본은 카드·간편결제. 토스페이먼츠와 휴대폰 결제 계약 후 Vercel 환경변수 `TOSS_MOBILE_PHONE=1`을 넣고 다시 배포하면 구매 상자에 "휴대폰 결제" 선택이 생긴다(테스트 키로는 계약 없이도 시험 가능).

실제 사이트(Vercel Production)에서는 **테스트 키(`test_`)로는 결제가 열리지 않는다**(무료로 감정서를 받아 가는 것을 막기 위해). 미리보기에서는 테스트 결제가 되고, `live_` 키로 바꾸면 실제 사이트 결제가 저절로 열린다. 실제 사이트에서 꼭 테스트 결제를 해야 하면 `ALLOW_TEST_PAYMENTS=1`.

결제가 열리는 조건: `checkoutOpen: true` + `TOSS_CLIENT_KEY`·`TOSS_SECRET_KEY` + 저장소(Upstash) + `ANTHROPIC_API_KEY`. 하나라도 없으면 "결제 준비 중"으로 표시됩니다.
`/api/reading`은 결제한 리포트 토큰이 있어야 풀이를 줍니다. 예전처럼 무료로 풀이를 주려면 `FREE_READING=1`(기존 Android 앱도 이 설정이 있어야 풀이가 나옵니다).

### Vercel 설정 순서
1. 토스페이먼츠 개발자센터 가입 → **API 개별 연동 키**(테스트) 복사 → Vercel 환경변수 `TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY`
2. Vercel 프로젝트 → Storage → Upstash(Redis) 연결(무료 플랜 가능) → `KV_REST_API_URL`·`KV_REST_API_TOKEN` 자동 등록
3. (선택) Resend 가입·도메인 인증 → `RESEND_API_KEY`, `MAIL_FROM`
4. 재배포 후 테스트 키로 결제 → 실제 판매는 토스 가맹 심사 후 `live_` 키로 교체


생년월일시를 입력하면 사주팔자를 계산하고, A4 책자형 감정서(약 20~30쪽)를 만들어 주는 Next.js 웹앱입니다.

- 구성: 맞춤 표지 → 발간사 → 목차 → Part 1 나의 천명 · Part 2 재물과 커리어 · Part 3 애정 및 인연운 · Part 4 10년 대운 · Part 5 올해·내년 세운과 개운법 → 작성 방식 및 면책 고지
- 계산 엔진(결정적): 사주팔자, 오행, 십신과 현대어 해석, 격국(월지 기준), 참고 용신(억부·균형 기준), 대운별 용신 부합도, 올해·내년 24개월 흐름, 행운의 색상·숫자·방위
- 인포그래픽: 명식표, 오행 원형 차트, 10년 대운 흐름 곡선, 월별 흐름표
- AI 풀이: 발간사와 5개 파트를 각각 따로(병렬) 생성. 파트별로 실패하면 그 파트만 다시 작성
- 사주 등급·희소도: 오행 균형·대운의 도움·중화·용신·귀인을 100점 만점으로 점수화하고, 1960~2009년에 태어날 수 있는 사주 438,312개(날짜 × 12시진 × 성별)와 비교해 다섯 단계 등급(상위 3/12/35/35/15%)과 "상위 n%"를 매깁니다. 같은 일주·격국·참고 용신 조합의 출현율, 천을·문창귀인 보유 여부와 전체 보유율, 대운 전성기도 함께 보여 줍니다.
- PDF: 매 쪽 하단에 "○○○님 전용 감정서 · 무단 복제 및 재배포 금지"와 쪽 번호(표지 제외)

- 결과 화면 아래 **PDF로 저장** 버튼으로 명식·오행·대운·풀이를 A4 PDF로 내보낼 수 있습니다(웹은 브라우저 인쇄 창, 앱은 Android 시스템 인쇄 창에서 "PDF로 저장" 선택).
- 회원 기능은 없습니다. 결제한 리포트는 링크(토큰)로만 열립니다.
- `ANTHROPIC_API_KEY`가 없으면 AI 풀이 없이 계산 결과만 보여 줍니다.

## 실행 방법

Node.js 20.9 이상이 필요합니다.

```bash
npm install
cp .env.example .env.local   # 필요하면 ANTHROPIC_API_KEY 입력
npm run dev                  # http://localhost:3000
```

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` / `npm start` | 프로덕션 빌드 / 실행 |
| `npm test` | 만세력 계산 단위 테스트 (Vitest) |
| `npm run typecheck` | 타입 검사 |
| `npm run build:grade-stats` | 등급 비교용 통계(`src/lib/saju/grade-stats.json`)를 다시 계산. 등급 규칙(`grade.ts`)이나 계산 엔진을 바꾸면 다시 실행 (약 1분) |

## 환경변수

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | 선택 | Claude API 키. 없으면 AI 풀이 영역에 안내 문구만 표시하고 계산 결과는 정상 동작합니다. |
| `ANTHROPIC_MODEL` | 선택 | 풀이에 쓸 모델. 기본값 `claude-opus-5-5`. |

API 키는 서버에서만 읽으며 브라우저로 전달되지 않습니다. AI에는 이름을 보내지 않고 명식 데이터(간지·십신·오행·대운)만 보냅니다.

## 배포

### Vercel
1. 저장소를 Vercel에 Import (프레임워크 자동 감지: Next.js)
2. Project Settings → Environment Variables에 `ANTHROPIC_API_KEY` 추가
3. Deploy

풀이 API(`/api/reading`)는 30~90초 걸릴 수 있어 `maxDuration = 120`초로 설정되어 있습니다. 플랜의 함수 실행 시간 한도가 이보다 짧으면 타임아웃이 날 수 있습니다.

### Netlify
`netlify.toml`이 포함되어 있습니다. 사이트를 연결하고 Site configuration → Environment variables에 `ANTHROPIC_API_KEY`를 추가한 뒤 배포합니다. 다만 Netlify 동기 함수는 실행 시간 한도가 짧아(기본 10초, 요청 시 최대 26초 — 배포 전 현재 한도 확인 필요) 풀이 생성이 타임아웃될 가능성이 높습니다. AI 풀이까지 쓰려면 Vercel을 권장합니다.

## Android 앱(APK)

같은 화면을 WebView로 감싼 Android 앱을 Gradle 없이 SDK 명령줄 도구만으로 빌드합니다.
명식 계산은 기기 안에서 하므로 인터넷 없이 동작하고, AI 풀이는 배포한 웹 서버의 `/api/reading`을 호출합니다.

```bash
# Ubuntu 기준 도구 설치
sudo apt-get install aapt dalvik-exchange zipalign apksigner android-sdk-platform-23

# AI 풀이 없이 (계산 결과만)
npm run build:android

# 배포한 웹 서버로 AI 풀이 연결
SAJU_API_BASE=https://내-배포-주소.vercel.app npm run build:android
```

결과물: `android/build/saju-reading.apk` (minSdk 23 / targetSdk 34, Android 6.0 이상).

- `SAJU_API_BASE`의 서버에는 `ANTHROPIC_API_KEY`가 설정되어 있어야 합니다. API 키는 앱에 넣지 않습니다.
- `/api/reading`은 앱 출처(`https://appassets.androidplatform.net`)에 대해서만 CORS를 허용합니다. 다만 인증·사용량 제한이 없으므로, 앱을 널리 배포하기 전에는 요청 제한을 추가해야 합니다.
- `android/debug.keystore`는 테스트용 디버그 서명 키입니다(비밀번호 `android`). 같은 키로 빌드해야 기존 설치본 위에 업데이트됩니다. 스토어 배포용은 `KEYSTORE`, `KEYSTORE_PASS`, `KEY_ALIAS` 환경변수로 별도 키를 지정하세요.
- 런처 아이콘은 `python3 scripts/make-icon.py`로 다시 만들 수 있습니다.

## 구조

```
src/
  lib/saju/calc.ts        만세력 계산 (사주팔자, 십신, 오행, 대운, 세운)
  lib/saju/constants.ts   천간·지지·오행·지장간 표
  lib/saju/grade.ts       사주 등급 점수·희소도 (grade-stats.json과 비교)
  lib/reading.ts          Claude 호출 (서버 전용)
  lib/reading-shared.ts   풀이 응답 스키마 (서버·브라우저 공용)
  app/api/chart           POST: 입력 → 명식 계산
  app/api/reading         POST: 입력 → 명식 계산 → AI 풀이
  components/             입력 폼, 명식표, 오행 차트, 대운, 풀이 화면
mobile/main.tsx           Android 앱용 진입점 (기기 내 계산)
android/                  매니페스트, MainActivity(WebView), 리소스
scripts/build-android.sh  APK 빌드 스크립트
tests/                    단위 테스트
```

## 계산 기준

절기와 간지 계산은 [lunar-javascript](https://github.com/6tail/lunar-javascript)를 쓰고, 한국 기준 보정을 그 위에 얹었습니다.

| 항목 | 기준 |
| --- | --- |
| 입력 시각 | 한국 표준시(UTC+9). 1954-03-21~1961-08-09의 UTC+8:30과 1987·1988년 서머타임 반영 |
| 년주 | 입춘 절입 시각 기준 (설날·양력 1월 1일 아님) |
| 월주 | 12절 절입 시각 기준. 절기 시각은 중국 표준시로 계산되므로 출생 순간을 UTC+8로 환산해 비교 |
| 시주 | 기본: 진태양시 보정(서울 동경 126.98° → 약 -32분). 화면의 "계산 옵션"에서 끌 수 있음 |
| 자시 일주 | 기본: 23시에 다음 날 일주. 옵션으로 야자시(자정에 날짜 변경) 선택 |
| 시각 모름 | 시주 제외 6글자로 분석. 절입일 전후면 월주가 달라질 수 있다고 안내 |
| 지지 십신 | 정기(본기) 지장간 기준 |
| 오행 분포 | 글자 개수 + 지장간을 나눠 더한 점수 |
| 신강·신약 | 비겁·인성 비중을 단순 점수화(월지 3, 일지 1.5, 그 외 1). 참고용 |
| 대운 | 양남음녀 순행, 음남양녀 역행. 시작 나이는 만 나이로 표기 |

### 알려진 한계
- 음력 변환은 중국 음력 기준 라이브러리를 씁니다. 한국 음력(한국천문연구원)과 드물게 하루 차이 날 수 있습니다.
- 1948~1960년 서머타임은 아직 반영하지 않습니다.
- 출생지는 서울 경도로 고정되어 있습니다(API의 `options.longitude`로는 변경 가능).
- 격국·용신 판단은 포함하지 않습니다.

## 테스트

`tests/calc.test.ts`는 알려진 명식(2000-01-01 = 己卯년 丙子월 戊午일 戊午시), 율리우스 적일 공식과의 일진 대조(1901~2099 표본),
1984년 입춘 경계, 1988년 서머타임, 진태양시 보정 경계, 23시 자시 처리, 음력·윤달 변환, 십신, 대운 방향을 검증합니다.
