import type { ReactNode } from "react";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="container">
      <header className="site">
        <h1>사주 풀이</h1>
        <p>생년월일시를 입력하면 사주팔자와 오행, 대운을 계산하고 항목별로 풀어 드립니다.</p>
      </header>
      {children}
      <p className="disclaimer">
        명식은 만세력 계산 엔진이, 풀이 문장은 AI(Claude)가 작성합니다. 재미와 자기 성찰을 위한 참고 자료로 활용해 주세요.
      </p>
    </main>
  );
}
