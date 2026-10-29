import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addProfile, findOrCreateMember, getMember, setMonthlyMail } from "@/lib/member";
import { monthlyMail, monthlyStatus, sendMonthlyMails, unsubscribeSig } from "@/lib/monthly-mail";
import { createMemoryStore, setStoreForTest } from "@/lib/store";
import { GET as unsubscribe } from "@/app/api/monthly/unsubscribe/route";

const NOW = new Date("2026-11-01T00:00:00Z"); // 한국 11월 1일 오전 9시

beforeEach(() => {
  setStoreForTest(createMemoryStore());
  vi.stubEnv("MEMBER_SESSION_SECRET", "x".repeat(40));
  vi.stubEnv("KAKAO_REST_API_KEY", "k");
  vi.stubEnv("RESEND_API_KEY", "re_x");
  vi.stubEnv("MAIL_FROM", "천기록 <no-reply@chungirok.com>");
  vi.stubEnv("MONTHLY_MAIL_GAP_MS", "0");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function member(withProfile = true) {
  const { member: m } = await findOrCreateMember("kakao", `k-${Math.random()}`, "테스터");
  if (withProfile) await addProfile(m.id, { name: "홍길동", gender: "male", calendar: "solar", year: 1990, month: 5, day: 15, hour: 10, minute: 30 });
  return m;
}

describe("이달의 운세 메일", () => {
  it("동의한 회원에게만, 달마다 한 번 보낸다", async () => {
    const a = await member();
    const b = await member();
    await setMonthlyMail(a.id, "a@b.co");
    const sent = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", sent);
    const run = await sendMonthlyMails("https://x.test", NOW);
    expect(run).toMatchObject({ ym: "2026-11", sent: 1, failed: 0, done: true });
    const body = JSON.parse((sent.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(body.to).toEqual(["a@b.co"]);
    expect(body.subject).toMatch(/^\(광고\) \[천기록\] 11월의 운세/);
    expect(body.text).toContain(`https://x.test/api/monthly/unsubscribe?m=${a.id}`);
    expect(body.headers["List-Unsubscribe"]).toContain("unsubscribe");
    // 같은 달 다시 돌려도(10시·11시 이어 보내기) 새로 보내지 않고, 기록은 이번 달 합계로 남는다
    sent.mockClear();
    const again = await sendMonthlyMails("https://x.test", NOW);
    expect(sent).not.toHaveBeenCalled();
    expect(again).toMatchObject({ ym: "2026-11", sent: 1, failed: 0 });
    expect((await monthlyStatus()).subscribers).toBe(1);
    void b;
  });

  it("내 사주가 없으면 보내지 않고, 이메일은 확인한다", async () => {
    const m = await member(false);
    await expect(setMonthlyMail(m.id, "not-an-email")).rejects.toThrow("이메일");
    const on = await setMonthlyMail(m.id, "c@d.co");
    expect(monthlyMail(on, "https://x.test", NOW)).toBeNull();
  });

  it("수신 거부 링크는 서명을 확인하고, 거부하면 이메일을 지운다", async () => {
    const m = await member();
    await setMonthlyMail(m.id, "a@b.co");
    const bad = await unsubscribe(new Request(`https://x.test/api/monthly/unsubscribe?m=${m.id}&s=wrong`));
    expect(bad.status).toBe(400);
    expect((await getMember(m.id))?.monthlyMail?.email).toBe("a@b.co");
    const ok = await unsubscribe(new Request(`https://x.test/api/monthly/unsubscribe?m=${m.id}&s=${unsubscribeSig(m.id)}`));
    expect(ok.status).toBe(200);
    expect((await getMember(m.id))?.monthlyMail).toBeUndefined();
  });
});
