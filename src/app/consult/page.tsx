import type { Metadata } from "next";
import { cookies } from "next/headers";
import ConsultChat, { type ConsultProfile } from "@/components/ConsultChat";
import SiteShell from "@/components/SiteShell";
import { SupportBox } from "@/components/SupportLinks";
import { QUESTION_PACKS, questionsLeft } from "@/lib/consult";
import { isMemberEnabled, MEMBER_COOKIE, memberFromCookie, type SavedProfile } from "@/lib/member";
import { checkoutConfig } from "@/lib/orders";
import { BRAND } from "@/lib/product";
import { isAiEnabled } from "@/lib/reading";

export const metadata: Metadata = { title: `AI 사주 상담 — ${BRAND.name}`, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const line = (p: SavedProfile) => {
  const i = p.input;
  return `${i.gender === "male" ? "남" : "여"} ${i.calendar === "lunar" ? "음" : "양"} ${i.year}.${i.month}.${i.day}${i.hour === null ? " 시각 모름" : ` ${i.hour}시`}`;
};

/** AI 사주 상담: 마이에 저장한 사주로 묻고 바로 답을 받는다. */
export default async function ConsultPage({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  const { paid } = await searchParams;
  const member = isMemberEnabled() ? await memberFromCookie((await cookies()).get(MEMBER_COOKIE)?.value).catch(() => null) : null;
  const intro = (
    <section className="card consult-hero">
      <h1>AI 사주 상담</h1>
      <p className="muted">
        “올해 이직해도 될까요?”, “계약은 언제 하는 게 좋을까요?”처럼 궁금한 것을 물으면, 내 명식(원국·대운·세운·월별 흐름)을 근거로 AI가 바로
        답합니다. 답변은 사람이 아닌 AI가 작성합니다.
      </p>
      <div className="consult-why">
        <p className="consult-why-h">일반 AI에게 묻는 것과 무엇이 다른가요?</p>
        <ul>
          <li>일반 AI 채팅은 사주를 실제로 계산하지 않고, 누구에게나 들어맞을 법한 상투적인 말로 답하기 쉽습니다.</li>
          <li>천기록은 먼저 생년월일시로 만세력(절기 시각 기준)을 세우고 오행·십신·용신·대운·세운·월별 흐름을 명리 공식으로 계산해 조회합니다.</li>
          <li>그 방대한 명식 자료와 명리 이론을 근거로 유료 고성능 AI가 질문에 맞춰 답하고, 어떤 간지·십신을 근거로 했는지 함께 밝힙니다. 명식에 없는 간지나 날짜는 지어내지 않습니다.</li>
        </ul>
      </div>
    </section>
  );

  if (!member) {
    return (
      <SiteShell nav="consult">
        {intro}
        <section className="card">
          <p>AI 상담은 회원 전용입니다. 카카오로 가입하면 무료 질문 3회를 드립니다.</p>
          {isMemberEnabled() ? (
            <a className="kakao-login" href="/api/auth/kakao?next=/consult">
              카카오로 시작하기
            </a>
          ) : (
            <p className="muted">회원 기능을 준비하고 있습니다.</p>
          )}
        </section>
        <SupportBox compact />
      </SiteShell>
    );
  }

  if (!member.profiles.length) {
    return (
      <SiteShell nav="consult">
        {intro}
        <section className="card">
          <p>먼저 상담할 사주를 저장해 주세요. 첫 화면에서 사주를 본 뒤 결과 위의 ‘마이에 저장’을 누르면 됩니다.</p>
          <a className="btn-secondary link-btn" href="/#saju-form">
            사주 보러 가기
          </a>
        </section>
      </SiteShell>
    );
  }

  const { enabled, testMode } = checkoutConfig();
  const profiles: ConsultProfile[] = member.profiles.map((p) => ({ id: p.id, name: p.input.name ?? "이름 없음", line: line(p), self: p.self }));
  return (
    <SiteShell nav="consult">
      {intro}
      {isAiEnabled() ? (
        <section className="card">
          <ConsultChat
            profiles={profiles}
            initialLeft={questionsLeft(member)}
            packs={Object.values(QUESTION_PACKS).map((p) => ({ ...p }))}
            checkoutOpen={enabled}
            testMode={testMode}
            justPaid={paid === "1"}
          />
        </section>
      ) : (
        <section className="card">
          <p className="muted">AI 상담을 잠시 쓸 수 없습니다.</p>
        </section>
      )}
      <SupportBox compact />
    </SiteShell>
  );
}
