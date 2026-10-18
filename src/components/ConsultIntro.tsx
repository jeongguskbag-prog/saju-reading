import { CONSULT_WHY } from "@/lib/consult-copy";

/** 첫 화면의 AI 사주 상담 소개(한국어 사이트). */
export default function ConsultIntro() {
  return (
    <section id="ai-consult" className="lp-section" aria-labelledby="ai-consult-h">
      <div className="lp-inner">
        <h2 id="ai-consult-h">AI 사주 상담</h2>
        <div className="consult-why lp-consult">
          <p className="consult-why-h">{CONSULT_WHY.title}</p>
          <p>{CONSULT_WHY.general}</p>
          <p>{CONSULT_WHY.ours}</p>
          <p>{CONSULT_WHY.engine}</p>
          <p className="muted">카카오로 가입하면 무료 질문 3회를 드립니다. 사주를 한 번 저장해 두면 다음부터 입력 없이 바로 물어볼 수 있습니다.</p>
          <a className="lp-cta-ghost" href="/consult">
            AI 상담 시작하기
          </a>
        </div>
      </div>
    </section>
  );
}
