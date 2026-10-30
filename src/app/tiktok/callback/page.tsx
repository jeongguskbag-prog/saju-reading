import type { Metadata } from "next";
import SiteShell from "@/components/SiteShell";

export const metadata: Metadata = { title: "TikTok connected — Chungirok", robots: { index: false } };

type Params = Promise<Record<string, string | string[] | undefined>>;

/** TikTok 로그인 후 돌아오는 주소. code를 화면에 보여 줘서 운영자가 복사해 자동화에 넣게 함 (서버에 저장하지 않음). */
export default async function TikTokCallback({ searchParams }: { searchParams: Params }) {
  const q = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || "";
  const code = one(q.code);
  const error = one(q.error);
  const desc = one(q.error_description);
  return (
    <SiteShell>
      <article className="card policy" lang="en">
        <h1>{error ? "TikTok connection failed" : "TikTok connected"}</h1>
        {error ? (
          <p>
            {error}
            {desc ? ` — ${desc}` : ""}. Please try again.
          </p>
        ) : code ? (
          <>
            <p>Copy the code below and paste it into the Chungirok Publisher setup. It expires in a few minutes.</p>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", userSelect: "all" }}>{code}</pre>
            <p className="muted">이 코드를 복사해서 자동화 설정에 붙여 넣으세요. 몇 분 안에 만료됩니다.</p>
          </>
        ) : (
          <p>No authorization code was received.</p>
        )}
      </article>
    </SiteShell>
  );
}
