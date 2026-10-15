import { NextResponse } from "next/server";
import { calculateSaju, InputError } from "@/lib/saju/calc";
import { parseBirthInput } from "@/lib/input";
import { generatePart, isAiEnabled, ReadingError } from "@/lib/reading";
import { PART_KEYS, type PartKey } from "@/lib/report-shared";

// 파트 하나 생성에 1~2분 걸릴 수 있다.
export const maxDuration = 300;

// Android 앱의 WebView 출처. 앱에서 이 API를 호출할 수 있도록 CORS를 허용한다.
const APP_ORIGIN = "https://appassets.androidplatform.net";

function withCors(request: Request, response: NextResponse) {
  if (request.headers.get("origin") === APP_ORIGIN) {
    response.headers.set("Access-Control-Allow-Origin", APP_ORIGIN);
    response.headers.set("Vary", "Origin");
  }
  return response;
}

export function OPTIONS(request: Request) {
  const response = withCors(request, new NextResponse(null, { status: 204 }));
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

export async function POST(request: Request) {
  return withCors(request, await handle(request));
}

async function handle(request: Request): Promise<NextResponse> {
  if (!isAiEnabled()) {
    return NextResponse.json({ error: "AI 풀이가 설정되지 않았습니다." }, { status: 503 });
  }
  const body = await request.json().catch(() => null);
  const part = body?.part as PartKey;
  if (!PART_KEYS.includes(part)) return NextResponse.json({ error: "요청한 파트가 올바르지 않습니다." }, { status: 400 });
  const parsed = parseBirthInput(body?.input);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    // 계산은 서버에서 다시 해서, 클라이언트가 보낸 명식을 믿지 않는다.
    const chart = calculateSaju(parsed.value);
    return NextResponse.json(await generatePart(chart, part));
  } catch (error) {
    if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof ReadingError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error(error);
    return NextResponse.json({ error: "풀이 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
