import { NextResponse } from "next/server";
import { calculateSaju, InputError } from "@/lib/saju/calc";
import { parseBirthInput } from "@/lib/input";
import { generateReading, isAiEnabled, ReadingError } from "@/lib/reading";

// 풀이 생성은 30~90초 걸릴 수 있다.
export const maxDuration = 120;

export async function POST(request: Request) {
  if (!isAiEnabled()) {
    return NextResponse.json({ error: "AI 풀이가 설정되지 않았습니다." }, { status: 503 });
  }
  const parsed = parseBirthInput(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    // 계산은 서버에서 다시 해서, 클라이언트가 보낸 명식을 믿지 않는다.
    const chart = calculateSaju(parsed.value);
    return NextResponse.json({ reading: await generateReading(chart) });
  } catch (error) {
    if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof ReadingError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error(error);
    return NextResponse.json({ error: "풀이 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
