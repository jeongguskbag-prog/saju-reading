import type { Metadata } from "next";
import { cookies } from "next/headers";
import SiteShell from "@/components/SiteShell";
import { AccountButtons, ClaimOrderForm, ProfileButtons, SavePendingProfile } from "@/components/MyActions";
import { isMemberEnabled, memberSetupMissing, MAX_PROFILES, MEMBER_COOKIE, memberFromCookie, memberOrders, REPORT_BONUS_QUESTIONS, WELCOME_QUESTIONS, type SavedProfile } from "@/lib/member";
import { productOf } from "@/lib/orders";
import { BRAND } from "@/lib/product";
import { calculateSaju } from "@/lib/saju/calc";
import { dailyFortune } from "@/lib/saju/daily";
import { questionsLeft } from "@/lib/consult";

export const metadata: Metadata = { title: `마이 — ${BRAND.name}`, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  disabled: "회원 기능을 준비하고 있습니다. 조금만 기다려 주세요.",
  cancelled: "카카오 로그인을 취소했습니다.",
  state: "로그인 시간이 지났거나 다른 창에서 시작한 로그인입니다. 다시 시도해 주세요.",
  busy: "로그인 시도가 너무 많습니다. 잠시 뒤 다시 시도해 주세요.",
  kakao: "카카오에서 로그인 정보를 받지 못했습니다. 다시 시도해 주세요.",
  server: "로그인 중 문제가 생겼습니다. 잠시 뒤 다시 시도해 주세요.",
};

const BENEFITS = [
  ["내 사주·가족 사주 저장", `최대 ${MAX_PROFILES}명까지 저장해 두고 다음부터 입력 없이 바로 봅니다.`],
  ["감정서 평생 보관함", `로그인하고 산 감정서는 열람 기간 없이 언제든 다시 열 수 있습니다. 예전에 산 감정서도 넣을 수 있고, 보관함에 넣은 감정서마다 AI 상담 무료 질문 ${REPORT_BONUS_QUESTIONS}회를 드립니다.`],
  ["매일 오늘의 운세", "오늘의 일진과 내 명식을 맞춰 본 하루 운세를 매일 드립니다."],
  [
    "명리 기반 AI 상담 무료 질문",
    `일반 AI처럼 누구에게나 맞을 법한 상투적인 말로 답하지 않습니다. 먼저 내 생년월일시로 만세력을 세워 오행·십신·용신·대운·세운을 명리 공식으로 계산·조회하고, 대운·세운·월별 흐름까지 계산한 방대한 명식 자료와 명리 이론을 근거로 유료 고성능 AI가 답합니다. 가입하면 무료 질문 ${WELCOME_QUESTIONS}회를 드립니다.`,
  ],
] as const;

const fmtDate = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 9 * 3_600_000);
  return `${d.getUTCFullYear()}.${d.getUTCMonth() + 1}.${d.getUTCDate()}`;
};

function profileLine(p: SavedProfile): string {
  const i = p.input;
  const time = i.hour === null ? "시각 모름" : `${i.hour}시 ${i.minute ?? 0}분`;
  return `${i.gender === "male" ? "남" : "여"} · ${i.calendar === "lunar" ? `음력${i.isLeapMonth ? "(윤)" : ""}` : "양력"} ${i.year}.${i.month}.${i.day} · ${time}`;
}

export default async function MyPage({ searchParams }: { searchParams: Promise<{ error?: string; welcome?: string; bye?: string }> }) {
  const q = await searchParams;
  const enabled = isMemberEnabled();
  const member = enabled ? await memberFromCookie((await cookies()).get(MEMBER_COOKIE)?.value).catch(() => null) : null;

  if (!member) {
    return (
      <SiteShell nav="my">
        <section className="card my-hero">
          <h1>마이</h1>
          {q.bye && <p className="notice">탈퇴가 끝났습니다. 그동안 이용해 주셔서 감사합니다.</p>}
          {q.error && (
            <p className="error" role="alert">
              {ERRORS[q.error] ?? ERRORS.server}
            </p>
          )}
          <p className="muted">회원 가입 없이도 사주 보기와 감정서 구매를 모두 이용할 수 있습니다. 가입하면 아래 혜택을 드립니다.</p>
          <ul className="my-benefits">
            {BENEFITS.map(([b, d]) => (
              <li key={b}>
                <b>{b}</b>
                <span>{d}</span>
              </li>
            ))}
          </ul>
          {enabled ? (
            <a className="kakao-login" href="/api/auth/kakao?next=/my">
              카카오로 3초 만에 시작하기
            </a>
          ) : (
            <>
              <p className="muted">회원 기능을 준비하고 있습니다.</p>
              {/* 설정 확인용: 빠진 환경변수 이름만 보인다(값은 보이지 않는다). */}
              <p className="muted small">설정 확인: {memberSetupMissing().join(", ")} 없음</p>
            </>
          )}
          <p className="muted small">카카오에서는 회원 번호와 닉네임만 받습니다. 가입하면 이용약관과 개인정보처리방침에 동의한 것으로 봅니다.</p>
        </section>
        <section className="card">
          <h2>비회원 주문 조회</h2>
          <p className="muted">감정서 주소를 잃어버렸다면 주문번호와 연락처로 다시 찾을 수 있습니다.</p>
          <a className="btn-secondary" href="/order">
            주문 조회
          </a>
        </section>
      </SiteShell>
    );
  }

  const self = member.profiles.find((p) => p.self);
  const fortune = self ? dailyFortune(calculateSaju(self.input)) : null;
  const orders = await memberOrders(member).catch(() => []);

  return (
    <SiteShell nav="my">
      <SavePendingProfile />
      <section className="card my-hero">
        <h1>{member.nickname}님의 마이</h1>
        {q.welcome && <p className="notice">가입을 환영합니다. 가입 혜택으로 AI 상담 무료 질문 {WELCOME_QUESTIONS}회를 드렸습니다.</p>}
        <p className="muted">
          AI 상담 질문 {questionsLeft(member)}회 남음 · <a href="/consult">AI 상담하기</a>
        </p>
      </section>

      <section className="card my-fortune" aria-labelledby="fortune-h">
        <h2 id="fortune-h">오늘의 운세</h2>
        {fortune && self ? (
          <>
            <p className="muted">
              {fortune.date.replace(/-/g, ".")} · 오늘의 일진 {fortune.ganzhi}({fortune.reading})일 · {self.input.name ?? "내"} 사주 기준
            </p>
            <p className="my-fortune-title">
              <span className={`mark mark-${fortune.mark}`}>{fortune.mark}</span> {fortune.title}
            </p>
            <p>{fortune.text}</p>
            <p>{fortune.tone}</p>
            <p className="muted">
              오늘 도움이 되는 기운: {fortune.lucky.element} · 색 {fortune.lucky.colors} · 숫자 {fortune.lucky.numbers} · 방위 {fortune.lucky.direction}
            </p>
            <p className="muted small">일진의 십신({fortune.god})과 참고 용신 부합도({fortune.score}/100)로 정한 참고용 운세입니다.</p>
          </>
        ) : (
          <p className="muted">
            내 사주를 저장하면 매일 오늘의 운세를 보여 드립니다. <a href="/#saju-form">사주 보러 가기</a>
          </p>
        )}
      </section>

      <section className="card" aria-labelledby="profiles-h">
        <h2 id="profiles-h">
          저장한 사주 <small className="muted">{member.profiles.length}/{MAX_PROFILES}</small>
        </h2>
        {member.profiles.length ? (
          <ul className="my-list">
            {member.profiles.map((p) => (
              <li key={p.id}>
                <div>
                  <b>{p.input.name ?? "이름 없음"}</b> {p.self && <span className="tag">내 사주</span>}
                  <span className="muted">{profileLine(p)}</span>
                </div>
                <ProfileButtons id={p.id} self={p.self} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">아직 저장한 사주가 없습니다.</p>
        )}
        <p className="muted small">
          첫 화면에서 사주를 본 뒤 결과 위의 ‘마이에 저장’을 누르면 여기에 담깁니다. <a href="/#saju-form">새 사주 보기</a>
        </p>
      </section>

      <section className="card" aria-labelledby="orders-h">
        <h2 id="orders-h">감정서 보관함</h2>
        {orders.length ? (
          <ul className="my-list">
            {orders.map((o) => (
              <li key={o.id}>
                <div>
                  <b>{productOf(o).name}</b>
                  <span className="muted">
                    {o.input.name} · {fmtDate(o.paidAt ?? o.createdAt)} 결제 · {o.id}
                  </span>
                </div>
                <div className="my-row-actions">
                  <a className="btn-secondary" href={`/r/${o.token}`}>
                    열기
                  </a>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">아직 보관함에 감정서가 없습니다. 로그인한 상태로 감정서를 사면 자동으로 담깁니다.</p>
        )}
        <ClaimOrderForm />
      </section>

      <section className="card">
        <AccountButtons />
      </section>
    </SiteShell>
  );
}
