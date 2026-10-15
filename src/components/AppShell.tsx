import type { ReactNode } from "react";
import { BRAND } from "@/lib/product";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="container">
      <header className="site">
        <span className="badge no-print">정밀 만세력 × 최신 AI 감정</span>
        <h1>{BRAND.name} <small>{BRAND.hanja}</small></h1>
        <p className="no-print">
          이 감정서는 절기를 분 단위까지 계산하는 정밀 만세력 엔진으로 사주 명식을 산출하고, 방대한 지식을 학습한 최신 유료 AI
          모델(Anthropic Claude)이 오행·십신·대운의 명리 이론에 따라 풀이를 작성합니다.
        </p>
      </header>
      {children}
      <p className="disclaimer">
        명식은 만세력 계산 엔진이, 풀이 문장은 AI(Claude)가 작성합니다. 재미와 자기 성찰을 위한 참고 자료로 활용해 주세요.
      </p>
    </main>
  );
}
