import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/** 맡아 둔 사주 유형 카드 이미지를 파일로 내려준다(10분). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(id)) return new Response("없는 이미지입니다.", { status: 404 });
  const saved = await getStore()?.get<{ type: string; data: string }>(`type-card:${id}`);
  if (!saved) return new Response("이미지 저장 시간(10분)이 지났습니다. 사이트에서 다시 만들어 주세요.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const ext = saved.type === "image/png" ? "png" : "jpg";
  return new Response(new Uint8Array(Buffer.from(saved.data, "base64")), {
    headers: {
      "Content-Type": saved.type,
      "Content-Disposition": `attachment; filename="chungirok-type.${ext}"; filename*=UTF-8''${encodeURIComponent(`천기록_내사주유형.${ext}`)}`,
      "Cache-Control": "no-store",
    },
  });
}
