import { NextResponse } from "next/server";
import { calculateSaju, InputError } from "@/lib/saju/calc";
import { parseBirthInput } from "@/lib/input";

export async function POST(request: Request) {
  const parsed = parseBirthInput(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    return NextResponse.json({ chart: calculateSaju(parsed.value) });
  } catch (error) {
    if (error instanceof InputError) {
      return NextResponse.json({ error: error.message, code: error.code, params: error.params }, { status: 400 });
    }
    throw error;
  }
}
