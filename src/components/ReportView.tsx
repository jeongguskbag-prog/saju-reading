import type { ReactNode } from "react";
import type { SajuChart } from "@/lib/saju/calc";
import { CHAPTERS, CHAPTER_KEYS, withYears, type Chapter, type ChapterKey, type Intro, type PartKey, type PartResult } from "@/lib/report-shared";
import { AnalysisCard, DaeunCard, ElementCard, LuckyCard, PillarsCard, YearFlowCard } from "./ChartView";
import GradeCard from "./GradeCard";
import MethodBox from "./MethodBox";

export type PartState = { status: "loading" } | { status: "done"; result: PartResult } | { status: "error"; message: string };
export type PartStates = Partial<Record<PartKey, PartState>>;

interface Props {
  chart: SajuChart;
  aiEnabled: boolean;
  parts: PartStates;
  onRetry: (part: PartKey) => void;
}

const clientName = (chart: SajuChart) => chart.input.name?.trim() || "의뢰인";
const watermark = (chart: SajuChart) => `${clientName(chart)}님 전용 감정서 · 무단 복제 및 재배포 금지`;
/** CSS content 문자열로 안전하게 감싼다(따옴표·역슬래시·꺾쇠 이스케이프). */
const cssString = (text: string) => `"${text.replace(/[\\"<>]/g, (c) => `\\${c.charCodeAt(0).toString(16)} `)}"`;

function introOf(parts: PartStates): Intro | null {
  const s = parts.intro;
  return s?.status === "done" && s.result.part === "intro" ? s.result.intro : null;
}

function chapterOf(parts: PartStates, key: ChapterKey): Chapter | null {
  const s = parts[key];
  return s?.status === "done" && s.result.part === key ? s.result.chapter : null;
}

function birthLine(chart: SajuChart) {
  const { input } = chart;
  const date = input.calendar === "lunar" ? `음력 ${chart.lunarDate} (양력 ${chart.solarDate})` : `양력 ${chart.solarDate}`;
  const time = input.hour === null ? "시각 미상" : `${input.hour}시 ${input.minute ?? 0}분`;
  return `${input.gender === "male" ? "남성" : "여성"} · ${date} · ${time}`;
}

function Cover({ chart, intro }: { chart: SajuChart; intro: Intro | null }) {
  const [y1, y2] = chart.analysis.reportYears;
  return (
    <section className="cover print-only">
      <div className="cover-badge">정밀 만세력 × 최신 AI 감정</div>
      <div className="cover-years">{y1}-{y2}</div>
      <h1 className="cover-title">
        {clientName(chart)}님 맞춤형
        <br />
        인생 나침반
      </h1>
      <div className="cover-pillars">
        {[chart.pillars.hour, chart.pillars.day, chart.pillars.month, chart.pillars.year]
          .filter((p) => p !== null)
          .map((p) => (
            <span key={p.label}>{p.stem}{p.branch}</span>
          ))}
      </div>
      {intro && <p className="cover-keywords">{intro.coverKeywords.slice(0, 3).join(" · ")}</p>}
      <p className="cover-meta">{birthLine(chart)}</p>
      <p className="cover-meta">발행일 {new Date().toLocaleDateString("ko-KR")}</p>
    </section>
  );
}

function Toc({ chart }: { chart: SajuChart }) {
  const years = chart.analysis.reportYears;
  return (
    <section className="toc print-only">
      <h2>목차</h2>
      <ol>
        <li><span>발간사</span></li>
        {CHAPTER_KEYS.map((k) => (
          <li key={k}>
            <span>{CHAPTERS[k].label}. {withYears(CHAPTERS[k].title, years)}</span>
            <small>{CHAPTERS[k].sections.map((s) => withYears(s, years)).join(" · ")}</small>
          </li>
        ))}
        <li><span>감정서 작성 방식 및 고지</span></li>
      </ol>
    </section>
  );
}

function Pending({ state, onRetry, label }: { state: PartState | undefined; onRetry: () => void; label: string }) {
  if (!state || state.status === "loading") {
    return (
      <div className="card loading no-print" aria-live="polite">
        <span className="spinner" aria-hidden /> {label} 풀이를 작성하고 있습니다. 1~2분 정도 걸립니다.
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="card no-print">
        <p className="error" role="alert">{label}: {state.message}</p>
        <button type="button" className="btn-secondary" onClick={onRetry}>이 파트 다시 작성</button>
      </div>
    );
  }
  return null;
}

function ChapterText({ chapter }: { chapter: Chapter }) {
  return (
    <section className="card chapter">
      {chapter.sections.map((s, i) => (
        <article key={i} className="section">
          <h3>{s.heading}</h3>
          {s.paragraphs.map((p, j) => (
            <p key={j}>{p}</p>
          ))}
        </article>
      ))}
      {chapter.actionPlan.length > 0 && (
        <div className="action-plan">
          <h4>실천 개운법</h4>
          <ul>
            {chapter.actionPlan.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default function ReportView({ chart, aiEnabled, parts, onRetry }: Props) {
  const years = chart.analysis.reportYears;
  const intro = introOf(parts);
  const visuals: Partial<Record<ChapterKey, ReactNode>> = {
    part1: (
      <>
        <PillarsCard chart={chart} />
        <ElementCard chart={chart} />
        <AnalysisCard chart={chart} />
      </>
    ),
    part4: <DaeunCard chart={chart} />,
    part5: (
      <>
        <YearFlowCard chart={chart} />
        <LuckyCard chart={chart} />
      </>
    ),
  };

  return (
    <div className="report">
      <Cover chart={chart} intro={intro} />

      <GradeCard chart={chart} />

      {aiEnabled && (
        <section className="card preface">
          <h2>발간사</h2>
          {intro ? (
            <>
              <p className="summary">{intro.summary}</p>
              {intro.preface.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </>
          ) : (
            <Pending state={parts.intro} onRetry={() => onRetry("intro")} label="발간사" />
          )}
        </section>
      )}

      <Toc chart={chart} />

      {!aiEnabled && (
        <section className="card no-print">
          <h2>항목별 풀이</h2>
          <p className="muted">AI 풀이가 연결되지 않아 계산 결과만 보여 드립니다.</p>
        </section>
      )}

      {CHAPTER_KEYS.map((key) => {
        const meta = CHAPTERS[key];
        const chapter = chapterOf(parts, key);
        if (!aiEnabled && !visuals[key]) return null;
        return (
          <section key={key} className="part">
            <header className="part-head">
              <span>{meta.label}</span>
              <h2>{withYears(meta.title, years)}</h2>
              <p>{meta.lead}</p>
            </header>
            {visuals[key]}
            {aiEnabled && (chapter ? <ChapterText chapter={chapter} /> : <Pending state={parts[key]} onRetry={() => onRetry(key)} label={meta.label} />)}
          </section>
        );
      })}

      <MethodBox chart={chart} hasReading={aiEnabled && CHAPTER_KEYS.some((k) => chapterOf(parts, k))} />
      <div className="print-footer print-only">{watermark(chart)}</div>
      {/* PDF 각 쪽 하단의 워터마크와 쪽 번호(표지 제외). 이름이 들어가므로 여기서 만든다. */}
      <style>{`@media print {
  @page { @bottom-center { content: ${cssString(watermark(chart))}; font-size: 8.5pt; color: #9a978d; }
          @bottom-right { content: counter(page); font-size: 8.5pt; color: #9a978d; } }
  @page :first { @bottom-center { content: none; } @bottom-right { content: none; } }
}`}</style>
    </div>
  );
}
