import { randomBytes } from "node:crypto";
import { clientIp } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const MAX_BYTES = 900_000;

/**
 * 사주 유형 카드 이미지를 10분 동안 맡아 두고 받을 주소를 준다.
 * 앱(WebView)이나 카카오톡 안 브라우저는 화면에서 만든 이미지를 저장하지 못해, 이 주소를 휴대폰 브라우저로 열어 저장한다.
 * 이미지에는 이름이 없고(유형·비율만), 10분 뒤 지워진다.
 */
export async function POST(request: Request) {
  const store = getStore();
  if (!store) return Response.json({ error: "잠시 뒤 다시 시도해 주세요." }, { status: 503 });
  const hour = new Date().toISOString().slice(0, 13);
  if ((await store.incr(`type-card-rate:${clientIp(request.headers)}:${hour}`, 3600)) > 30) {
    return Response.json({ error: "잠시 뒤 다시 시도해 주세요." }, { status: 429 });
  }
  const type = request.headers.get("content-type") ?? "";
  if (!/^image\/(jpeg|png)$/.test(type)) return Response.json({ error: "이미지가 아닙니다." }, { status: 400 });
  const buf = Buffer.from(await request.arrayBuffer());
  if (!buf.length || buf.length > MAX_BYTES) return Response.json({ error: "이미지가 너무 큽니다." }, { status: 413 });
  const id = randomBytes(12).toString("base64url");
  await store.set(`type-card:${id}`, { type, data: buf.toString("base64") }, 600);
  return Response.json({ path: `/api/type-card/${id}` });
}
