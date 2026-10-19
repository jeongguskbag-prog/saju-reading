import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { LocaleProvider } from "@/components/LocaleProvider";
import SajuApp from "@/components/SajuApp";
import SiteShell from "@/components/SiteShell";
import { MEMBER_COOKIE, memberFromCookie } from "@/lib/member";
import { checkoutConfig } from "@/lib/orders";
import { BRAND } from "@/lib/product";
import { isAiEnabled, isFreeReading } from "@/lib/reading";

export const metadata: Metadata = { title: `저장한 사주 — ${BRAND.name}`, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** 마이에 저장한 사주를 입력 없이 바로 본다. 결과 아래에는 첫 화면과 같은 감정서 신청 칸이 나온다. */
export default async function SavedProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await memberFromCookie((await cookies()).get(MEMBER_COOKIE)?.value).catch(() => null);
  if (!member) redirect("/my");
  const profile = member.profiles.find((p) => p.id === id);
  if (!profile) notFound();
  const { enabled, testMode, mobilePhone, sms, kakao, release } = checkoutConfig();
  // 첫 화면과 같은 방식(FREE_READING=1이면 바로 무료 풀이, 아니면 등급까지 무료 + 감정서 신청).
  const free = isFreeReading() && isAiEnabled();
  return (
    <SiteShell nav="my">
      <p className="muted">
        <a href="/my">← 마이로</a>
      </p>
      <LocaleProvider locale="ko">
        <SajuApp aiEnabled={free} checkout={free ? undefined : { enabled, testMode, mobilePhone, sms, kakao, release }} initial={profile.input} autoRun />
      </LocaleProvider>
    </SiteShell>
  );
}
