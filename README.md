# 천기록(天機錄) — 100년 종합사주

> 브랜드: 천기록. 디자인은 쪽빛 고서 표지 · 닥종이 한지 · 먹 · 인주(붉은 도장) 콘셉트이며, 제목 글꼴은 송명(Song Myung)입니다.
> 첫 화면은 판매용 랜딩 페이지(`src/components/Landing.tsx`)이고, 그 아래에 사주 입력 폼이 있습니다. 브랜드명·상품명·가격·결제 오픈 여부는 `src/lib/product.ts`에서 바꿉니다(결제 기능은 아직 없음).


생년월일시를 입력하면 사주팔자를 계산하고, A4 책자형 감정서(약 20~30쪽)를 만들어 주는 Next.js 웹앱입니다.

- 구성: 맞춤 표지 → 발간사 → 목차 → Part 1 나의 천명 · Part 2 재물과 커리어 · Part 3 애정 및 인연운 · Part 4 10년 대운 · Part 5 올해·내년 세운과 개운법 → 작성 방식 및 면책 고지
- 계산 엔진(결정적): 사주팔자, 오행, 십신과 현대어 해석, 격국(월지 기준), 참고 용신(억부·균형 기준), 대운별 용신 부합도, 올해·내년 24개월 흐름, 행운의 색상·숫자·방위
- 인포그래픽: 명식표, 오행 원형 차트, 10년 대운 흐름 곡선, 월별 흐름표
- AI 풀이: 발간사와 5개 파트를 각각 따로(병렬) 생성. 파트별로 실패하면 그 파트만 다시 작성
- 사주 등급·희소도: 오행 균형·대운의 도움·중화·용신·귀인을 100점 만점으로 점수화하고, 1960~2009년에 태어날 수 있는 사주 438,312개(날짜 × 12시진 × 성별)와 비교해 다섯 단계 등급(상위 3/12/35/35/15%)과 "상위 n%"를 매깁니다. 같은 일주·격국·참고 용신 조합의 출현율, 천을·문창귀인 보유 여부와 전체 보유율, 대운 전성기도 함께 보여 줍니다.
- PDF: 매 쪽 하단에 "○○○님 전용 감정서 · 무단 복제 및 재배포 금지"와 쪽 번호(표지 제외)

- 결과 화면 아래 **PDF로 저장** 버튼으로 명식·오행·대운·풀이를 A4 PDF로 내보낼 수 있습니다(웹은 브라우저 인쇄 창, 앱은 Android 시스템 인쇄 창에서 "PDF로 저장" 선택).
- 결제·회원 기능은 없습니다.
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
