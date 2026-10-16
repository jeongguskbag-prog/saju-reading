import type { ReactNode } from "react";
import type { SajuChart } from "@/lib/saju/calc";
import { ELEMENT_KO, type Element } from "@/lib/saju/constants";
import type { NameAnalysis, NamingComputed } from "@/lib/naming/engine";
import { FEELING_LABEL } from "@/lib/naming/request";
import type { NamingResultData } from "@/lib/report-shared";
import { Cover, Pending, cssString, watermark, type PartStates } from "./ReportView";
import { ElementCard, PillarsCard } from "./ChartView";
import { useT } from "./LocaleProvider";

const NUM = ["一", "二", "三", "四", "五"];
const el = (e: Element | null) => (e ? ELEMENT_KO[e] : "—");
const elVar = (e: Element | null) => (e ? ({ "--el": `var(--el-${e})` } as React.CSSProperties) : undefined);
const ROLE: Record<NameAnalysis["fit"][number]["role"], string> = {
  yongsin: "용신 보완",
  huisin: "희신 보완",
  missing: "부족한 오행 채움",
  neutral: "중립",
  gisin: "기신",
};

function Basis({ c }: { c: NamingComputed["basis"] }) {
  return (
    <div className="kv naming-basis">
      <div style={elVar(c.yongsin)}>
        <span>이름으로 북돋울 기운(용신)</span>
        <b><i className="swatch" aria-hidden />{ELEMENT_KO[c.yongsin]}</b>
      </div>
      <div style={elVar(c.huisin)}>
        <span>함께 도우면 좋은 기운(희신)</span>
        <b><i className="swatch" aria-hidden />{ELEMENT_KO[c.huisin]}</b>
      </div>
      <div style={elVar(c.gisin)}>
        <span>이름에 피한 기운(기신)</span>
        <b><i className="swatch" aria-hidden />{ELEMENT_KO[c.gisin]}</b>
      </div>
      <div>
        <span>원국에 없는 오행</span>
        <b>{c.missing.length ? c.missing.map((e) => ELEMENT_KO[e]).join(", ") : "없음"}</b>
      </div>
    </div>
  );
}

function CharTable({ n }: { n: NameAnalysis }) {
  const rows = [...n.surname.map((c) => ({ ...c, surname: true })), ...n.chars.map((c) => ({ ...c, surname: false }))];
  return (
    <table className="table naming-chars">
      <thead>
        <tr><th>한자</th><th>음</th><th>뜻</th><th>원획</th><th>자원오행</th><th>발음오행</th><th>음양</th></tr>
      </thead>
      <tbody>
        {rows.map((c, i) => (
          <tr key={i} className={c.surname ? "muted-row" : undefined}>
            <td className="hz-big">{c.char || "—"}</td>
            <td>{c.reading}</td>
            <td>{c.surname ? "성씨" : (c.meaning ?? "—")}</td>
            <td>{c.strokes || "—"}</td>
            <td style={elVar(c.element)}>{c.element ? <><i className="swatch" aria-hidden />{el(c.element)}</> : "—"}</td>
            <td>{el(c.sound)}</td>
            <td>{c.strokes ? (c.yang ? "양" : "음") : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Grids({ n }: { n: NameAnalysis }) {
  if (!n.grids.length) return <p className="muted">한자를 알 수 없어 수리(획수) 풀이는 생략했습니다.</p>;
  return (
    <table className="table naming-grids">
      <thead>
        <tr><th>격</th><th>수</th><th>길흉</th><th>풀이</th><th>시기</th></tr>
      </thead>
      <tbody>
        {n.grids.map((g) => (
          <tr key={g.key}>
            <td>{g.label}</td>
            <td>{g.number}</td>
            <td className={g.lucky ? "lucky" : "unlucky"}>{g.lucky ? "길(吉)" : "흉(凶)"}</td>
            <td>{g.gloss}</td>
            <td>{g.period}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Facts({ n }: { n: NameAnalysis }) {
  return (
    <ul className="naming-facts">
      <li>
        <b>발음 흐름</b> {n.soundFlow.map((s) => `${el(s.from)}→${el(s.to)} ${s.relation}`).join(" · ")}
      </li>
      <li>
        <b>획수 음양</b> {n.yinYangMixed ? "음과 양이 섞여 조화롭습니다" : "한쪽으로 치우쳐 있습니다"}
      </li>
      {n.fit.length > 0 && (
        <li>
          <b>사주 보완</b> {n.fit.map((f) => `${el(f.element)}(${ROLE[f.role]})`).join(" · ")}
        </li>
      )}
    </ul>
  );
}

function NameCard({ n, index, title, story }: { n: NameAnalysis; index: number; title?: string; story?: string[] }) {
  return (
    <section className="card naming-card">
      <p className="naming-no">추천 이름 {NUM[index] ?? index + 1}</p>
      <div className="naming-head">
        <p className="naming-hanja">
          {n.surname.map((c) => c.char).join("")}
          <span>{n.chars.map((c) => c.char).join("")}</span>
        </p>
        <p className="naming-hangul">{n.full}</p>
        {title && <p className="naming-title">{title}</p>}
      </div>
      <CharTable n={n} />
      <h3>원형이정(元亨利貞) 네 격</h3>
      <Grids n={n} />
      <Facts n={n} />
      {story && story.map((p, i) => <p key={i} className="naming-story">{p}</p>)}
    </section>
  );
}

function Method() {
  return (
    <section className="card method">
      <h2>작명 기준 및 고지</h2>
      <ol>
        <li><b>한자:</b> 대법원 인명용 한자로 쓸 수 있는 음과 글자만 골랐습니다(유니코드 한자 데이터베이스의 인명용 한자 표시 기준). 관례상 이름에 잘 쓰지 않는 글자(불용문자)는 추천에서 뺐습니다.</li>
        <li><b>수리:</b> 부수의 원래 글자 획수로 세는 원획법으로 원격·형격·이격·정격을 셈하고, 81수리의 길흉을 따랐습니다.</li>
        <li><b>자원오행:</b> 한자의 부수(뿌리 글자)와 뜻을 기준으로 정했고, 사주의 참고 용신·희신을 북돋우고 기신은 피했습니다.</li>
        <li><b>발음오행:</b> 이름 첫소리 기준(ㄱㅋ 목, ㄴㄷㄹㅌ 화, ㅇㅎ 토, ㅅㅈㅊ 금, ㅁㅂㅍ 수)으로 성과 이름이 서로 살리는 흐름을 살폈습니다.</li>
        <li><b>확인:</b> 출생신고나 개명 신청 전에 대법원 전자가족관계등록시스템에서 인명용 한자를 한 번 더 확인해 주세요. 성명학은 학파에 따라 기준이 다를 수 있어 참고 자료로 제시하며, 이름이 앞날을 보장하지는 않습니다.</li>
      </ol>
    </section>
  );
}

export default function NamingReport({
  chart,
  parts,
  onRetry,
  notice,
  title,
}: {
  chart: SajuChart;
  parts: PartStates;
  onRetry: () => void;
  notice?: ReactNode;
  title: string;
}) {
  const t = useT();
  const state = parts.naming;
  const data: NamingResultData | null = state?.status === "done" && state.result.part === "naming" ? state.result.naming : null;
  const req = data?.request;
  return (
    <div className="report naming">
      <Cover chart={chart} intro={null} title={title} />
      {notice}

      <section className="part naming-part">
        <header className="part-head">
          <span>序</span>
          <h2>사주로 본 이름의 방향</h2>
          <p>타고난 오행의 균형을 살펴, 이름으로 북돋울 기운을 정합니다.</p>
        </header>
        <PillarsCard chart={chart} />
        <ElementCard chart={chart} />
        {data ? (
          <section className="card">
            <h2>이름에 담을 기운</h2>
            <Basis c={data.computed.basis} />
            <p className="muted naming-req">
              {req!.mode === "baby" ? "아기 이름 짓기" : "개명"} · 성씨 {req!.surname}({req!.surnameHanja})
              {req!.generation ? ` · 돌림자 ${req!.generation.hanja}(${req!.generation.reading}) ${req!.generation.position === "first" ? "첫째" : "둘째"} 자리` : ""}
              {req!.feelings.length ? ` · 원하는 느낌: ${req!.feelings.map((f) => FEELING_LABEL[f]).join(", ")}` : ""}
            </p>
            {data.text.intro.map((p, i) => <p key={i}>{p}</p>)}
            {data.computed.relaxed && (
              <p className="muted">돌림자를 넣으면 네 격을 모두 길수로 맞출 수 없어, 세 격 이상이 길수인 이름까지 골랐습니다.</p>
            )}
          </section>
        ) : (
          <Pending state={state} onRetry={onRetry} label="작명록" />
        )}
      </section>

      {data && (
        <>
          {data.computed.current && (
            <section className="part naming-part">
              <header className="part-head">
                <span>現</span>
                <h2>지금 이름 살펴보기</h2>
                <p>지금 이름의 수리와 오행을 살펴, 새 이름이 무엇을 보완하는지 봅니다.</p>
              </header>
              <section className="card naming-card">
                <div className="naming-head">
                  <p className="naming-hanja">
                    {data.computed.current.surname.map((c) => c.char).join("")}
                    <span>{data.computed.current.chars.map((c) => c.char).join("")}</span>
                  </p>
                  <p className="naming-hangul">{data.computed.current.full}</p>
                </div>
                <CharTable n={data.computed.current} />
                <Grids n={data.computed.current} />
                <Facts n={data.computed.current} />
                {data.text.current.map((p, i) => <p key={i} className="naming-story">{p}</p>)}
              </section>
            </section>
          )}

          <section className="part naming-part">
            <header className="part-head">
              <span>名</span>
              <h2>추천 이름 {data.computed.candidates.length}선</h2>
              <p>네 격의 수리, 사주를 돕는 자원오행, 부르는 소리의 흐름을 함께 맞춘 이름입니다.</p>
            </header>
            {data.computed.candidates.map((n, i) => (
              <NameCard key={n.hangul} n={n} index={i} title={data.text.names[i]?.title} story={data.text.names[i]?.story} />
            ))}
          </section>

          {data.computed.hangulNames.length > 0 && (
            <section className="part naming-part">
              <header className="part-head">
                <span>韓</span>
                <h2>순한글 이름</h2>
                <p>한자 없이 우리말 뜻으로 짓는 이름도 함께 골랐습니다. 성과 이어 부르는 소리의 흐름을 살폈습니다.</p>
              </header>
              <section className="card">
                {data.computed.hangulNames.map((h, i) => (
                  <article key={h.name} className="naming-hangul-item">
                    <h3>
                      {req!.surname}
                      {h.name} <small>{h.meaning}</small>
                    </h3>
                    <p className="muted">발음 흐름: {h.soundFlow.join(" · ")}</p>
                    {data.text.hangul[i] && <p>{data.text.hangul[i]}</p>}
                  </article>
                ))}
              </section>
            </section>
          )}

          <section className="part naming-part">
            <header className="part-head">
              <span>結</span>
              <h2>이름을 고르실 때</h2>
            </header>
            <section className="card">
              {data.text.guide.map((p, i) => <p key={i}>{p}</p>)}
            </section>
            <Method />
          </section>
        </>
      )}
      <div className="print-footer print-only">{watermark(chart, t)}</div>
      <style>{`@media print {
  @page { @bottom-center { content: ${cssString(watermark(chart, t))}; font-size: 8.5pt; color: #9a978d; }
          @bottom-right { content: counter(page); font-size: 8.5pt; color: #9a978d; } }
  @page :first { @bottom-center { content: none; } @bottom-right { content: none; } }
}`}</style>
    </div>
  );
}
