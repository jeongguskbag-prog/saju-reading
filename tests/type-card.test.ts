import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/type-card/route";
import { GET } from "@/app/api/type-card/[id]/route";
import { createMemoryStore, setStoreForTest } from "@/lib/store";

beforeEach(() => setStoreForTest(createMemoryStore()));

describe("유형 카드 이미지 맡기기", () => {
  it("이미지를 맡기면 주소를 주고, 그 주소에서 파일로 내려받는다", async () => {
    const img = new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]);
    const res = await POST(new Request("https://x.test/api/type-card", { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: img }));
    const { path } = (await res.json()) as { path: string };
    expect(path).toMatch(/^\/api\/type-card\//);
    const got = await GET(new Request(`https://x.test${path}`), { params: Promise.resolve({ id: path.split("/").pop()! }) });
    expect(got.status).toBe(200);
    expect(got.headers.get("content-type")).toBe("image/jpeg");
    expect(got.headers.get("content-disposition")).toContain("attachment");
    expect(new Uint8Array(await got.arrayBuffer())).toEqual(img);
  });

  it("이미지가 아니면 받지 않는다", async () => {
    const res = await POST(new Request("https://x.test/api/type-card", { method: "POST", headers: { "Content-Type": "text/html" }, body: "<b>x</b>" }));
    expect(res.status).toBe(400);
  });
});
