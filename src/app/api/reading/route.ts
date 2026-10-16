import { NextResponse } from "next/server";
import { calculateSaju, InputError } from "@/lib/saju/calc";
import { parseBirthInput } from "@/lib/input";
import { generatePart, isAiEnabled, isAppRequest, isFreeReading, ReadingError } from "@/lib/reading";
import { PART_KEYS, type PartKey } from "@/lib/report-shared";
import { getReport } from "@/lib/orders";
import { ensurePart } from "@/lib/fulfill";
import { originFrom } from "@/lib/site";
import { StoreError } from "@/lib/store";
import { clientIp, takeFreeQuota } from "@/lib/rate-limit";
import type { Locale } from "@/lib/saju/locale";

// 파트 하나 생성에 1~2분 걸릴 수 있다.
export const maxDuration = 300;

const ROUTE_ERRORS = {
  ko: {
    noAi: "AI 풀이가 설정되지 않았습니다.",
    badPart: "요청한 파트가 올바르지 않습니다.",
    paywall: "풀이는 리포트를 구매한 뒤 볼 수 있습니다.",
    store: "리포트 저장소에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    unknown: "풀이 생성 중 오류가 발생했습니다.",
  },
  "zh-Hant": {
    noAi: "尚未設定 AI 解讀。",
    badPart: "請求的章節不正確。",
    paywall: "此解讀需透過 App 使用。",
    store: "無法連線至儲存空間，請稍後再試。",
    unknown: "產生解讀時發生錯誤。",
  },
  "zh-Hans": {
    noAi: "尚未配置 AI 解读。",
    badPart: "请求的章节不正确。",
    paywall: "此解读需通过应用使用。",
    store: "无法连接存储服务，请稍后再试。",
    unknown: "生成解读时出错。",
  },
} satisfies Record<Locale, unknown>;

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const asked = body?.locale ?? body?.input?.locale;
  const locale: Locale = asked === "zh-Hant" || asked === "zh-Hans" ? asked : "ko";
  const E = ROUTE_ERRORS[locale];
  if (!isAiEnabled()) {
    return NextResponse.json({ error: E.noAi }, { status: 503 });
  }
  const part = body?.part as PartKey;
  if (!PART_KEYS.includes(part)) return NextResponse.json({ error: E.badPart }, { status: 400 });

  if (typeof body?.token === "string") return paidPart(request, body.token, part);
  if (!isFreeReading() && !isAppRequest(request.headers.get("x-app-key"))) return NextResponse.json({ error: E.paywall }, { status: 402 });

  const parsed = parseBirthInput(body?.input);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    // 계산은 서버에서 다시 해서, 클라이언트가 보낸 명식을 믿지 않는다.
    const chart = calculateSaju(parsed.value);
    // 무료 풀이는 AI 요금이 드는 만큼 횟수를 제한한다(결제한 감정서는 위 paidPart에서 처리되어 제한 없음).
    // 입력 오류는 위에서 걸러져 횟수를 쓰지 않는다.
    const quota = await takeFreeQuota(clientIp(request.headers), new Date(), locale);
    if (!quota.ok) return NextResponse.json({ error: quota.message }, { status: 429 });
    return NextResponse.json(await generatePart(chart, part));
  } catch (error) {
    return errorResponse(error, locale);
  }
}

/** 결제한 리포트의 파트. 한 번 쓴 풀이는 저장해 두고 다시 열 때 그대로 돌려준다. */
async function paidPart(request: Request, token: string, part: PartKey): Promise<NextResponse> {
  try {
    const report = await getReport(token);
    if (!report) return NextResponse.json({ error: "리포트를 찾을 수 없습니다. 링크를 다시 확인해 주세요." }, { status: 404 });
    if (report.expired) return NextResponse.json({ error: "감정서 열람 기간이 지났습니다." }, { status: 410 });
    if (!report.product.parts.includes(part)) return NextResponse.json({ error: "이 감정서에 들어 있지 않은 파트입니다." }, { status: 400 });
    const r = await ensurePart(report, part, originFrom(request.headers));
    // 다른 곳(결제 직후 서버 작업이나 다른 창)에서 같은 파트를 쓰는 중이면 잠시 뒤 다시 물어보게 한다.
    if (r.status === "pending") return NextResponse.json({ pending: true }, { status: 202 });
    return NextResponse.json(r.result);
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown, locale: Locale = "ko"): NextResponse {
  const E = ROUTE_ERRORS[locale];
  if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400 });
  if (error instanceof ReadingError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof StoreError) return NextResponse.json({ error: E.store }, { status: 503 });
  console.error(error);
  return NextResponse.json({ error: E.unknown }, { status: 500 });
}
