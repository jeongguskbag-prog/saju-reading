/**
 * 첫 화면 '감정서에서 풀어 드리는 내용'. 실제 감정서 각 부(소제목)에 있는 내용만 카드로 싣고,
 * 핵심 명식록(발간사·제1부·제5부)에도 들어가는지, 종합 감정서에만 있는지 표시한다.
 */
type Scope = "both" | "full";

const TOPICS = (y1: number, y2: number): { glyph: string; tone: string; title: string; points: string[]; scope: Scope; part: string }[] => [
  { glyph: "月", tone: "sky", title: `${y1}년 월별 흐름`, points: ["달마다 힘을 실을 때와 쉬어 갈 때", "일·돈·관계에서 살필 달"], scope: "both", part: "제5부" },
  { glyph: "年", tone: "lilac", title: `${y1}·${y2}년 한 해 흐름`, points: ["해마다 밀고 나갈 일과 정리할 일", "점수보다 중요한 흐름의 순서"], scope: "both", part: "제5부" },
  { glyph: "業", tone: "sky", title: "직업·적성", points: ["직장형과 사업형 가운데 맞는 쪽", "일할 때 살릴 강점과 주의할 점"], scope: "full", part: "제2부" },
  { glyph: "財", tone: "gold", title: "재물운", points: ["타고난 재물 그릇과 돈이 들고 나는 방식", "돈을 지키는 리스크 관리와 개운법"], scope: "full", part: "제2부" },
  { glyph: "運", tone: "lilac", title: "대운과 인생의 전환점", points: ["10년 단위로 본 인생의 큰 흐름", "전성기 타이밍과 전환점에서 할 일"], scope: "full", part: "제4부" },
  { glyph: "健", tone: "mint", title: "건강 관리", points: ["오행 균형으로 본 생활 습관 제안", "무리하기 쉬운 달 살피기 (질병 예언은 하지 않습니다)"], scope: "both", part: "제5부" },
  { glyph: "緣", tone: "rose", title: "애정·결혼·가족", points: ["사랑하는 방식과 배우자 자리 해석", "결혼·자녀 상황에 맞춘 관계 조언"], scope: "full", part: "제3부" },
  { glyph: "今", tone: "paper", title: "지금의 나", points: ["타고난 기질과 그릇, 오행의 균형", "지금 대운에서 풀어야 할 과제 (종합)"], scope: "both", part: "제1·4부" },
];

export default function TopicCards({ years }: { years: [number, number] }) {
  return (
    <section id="topics" className="lp-section lp-topics" aria-labelledby="topics-h">
      <div className="lp-inner">
        <h2 id="topics-h">감정서에서 이렇게 풀어 드립니다</h2>
        <p className="lp-lead">명식 계산값을 근거로, 지금 바로 쓸 수 있게 주제별로 정리합니다.</p>
        <ul className="topic-cards">
          {TOPICS(years[0], years[1]).map((t) => (
            <li key={t.title} className={`topic-card tone-${t.tone}`}>
              <span className="topic-glyph" aria-hidden>{t.glyph}</span>
              <h3>{t.title}</h3>
              <ul>
                {t.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <p className="topic-scope">
                <span className={t.scope === "both" ? "tag both" : "tag full"}>{t.scope === "both" ? "핵심·종합" : "종합 감정서"}</span>
                <span className="topic-part">{t.part}</span>
              </p>
            </li>
          ))}
        </ul>
        <p className="muted topic-note">핵심 명식록에는 ‘핵심·종합’ 표시 주제가, 종합 감정서에는 모든 주제가 담깁니다.</p>
      </div>
    </section>
  );
}
