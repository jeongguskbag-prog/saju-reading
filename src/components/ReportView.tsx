import type { ReactNode } from "react";
import type { SajuChart } from "@/lib/saju/calc";
import { CHAPTERS, CHAPTER_KEYS, withYears, type Chapter, type ChapterKey, type Intro, type PartKey, type PartResult } from "@/lib/report-shared";
import { AnalysisCard, DaeunCard, ElementCard, LuckyCard, PillarsCard, YearFlowCard } from "./ChartView";
import GradeCard from "./GradeCard";
import BrandSeal, { Glyph } from "./BrandSeal";
import { BRAND } from "@/lib/product";
import MethodBox from "./MethodBox";

export type PartState = { status: "loading" } | { status: "done"; result: PartResult } | { status: "error"; message: string };
export type PartStates = Partial<Record<PartKey, PartState>>;

interface Props {
  chart: SajuChart;
  aiEnabled: boolean;
  parts: PartStates;
  onRetry: (part: PartKey) => void;
  /** 등급 카드 바로 아래에 넣을 내용(무료 결과의 구매 상자, 리포트의 링크 안내 등) */
  afterGrade?: ReactNode;
  /** 감정서에 담을 파트(상품별). 없으면 다섯 파트 모두 */
  include?: readonly ChapterKey[];
  /** 표지에 적을 감정서 이름 */
  title?: string;
}

const clientName = (chart: SajuChart) => chart.input.name?.trim() || "의뢰인";
const watermark = (chart: SajuChart) => `${BRAND.name} · ${clientName(chart)}님 전용 감정서 · 무단 복제 및 재배포 금지`;
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

const KO_DATE = (d: Date) => {
  const k = new Date(d.getTime() + 9 * 3_600_000); // 한국 시간
  return `${k.getUTCFullYear()}년 ${String(k.getUTCMonth() + 1).padStart(2, "0")}월 ${String(k.getUTCDate()).padStart(2, "0")}일`;
};

/** 생년월일 줄: "1989년 05월 14일 (양력) 巳時" */
function coverBirth(chart: SajuChart) {
  const { input } = chart;
  const [y, m, d] = chart.solarDate.split("-");
  const date = input.calendar === "lunar" ? `음력 ${chart.lunarDate} (양력 ${y}.${m}.${d})` : `${y}년 ${m}월 ${d}일 (양력)`;
  const hour = chart.pillars.hour ? `${chart.pillars.hour.branch}時` : "태어난 시각 미상";
  return `${date} ${hour}`;
}

/** PDF 표지(한 쪽 전체). 쪽빛 고서 표지에 이중 테두리, 天機錄 제목, 의뢰인 명식 카드, 낙관 직인. */
function Cover({ chart, intro, title }: { chart: SajuChart; intro: Intro | null; title?: string }) {
  const [y1, y2] = chart.analysis.reportYears;
  const order = [chart.pillars.hour, chart.pillars.day, chart.pillars.month, chart.pillars.year];
  return (
    <section className="cover print-only">
      <div className="cover-frame" aria-hidden />
      <div className="cover-top">
        <p className="cover-eyebrow">天 機 錄 · 百年綜合四柱</p>
        <svg className="cover-emblem" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <g fill="currentColor">
            <Glyph ch="天" x={27} y={27} w={46} h={46} />
          </g>
        </svg>
      </div>

      <div className="cover-mid">
        <p className="cover-sub">{title ?? "1:1 맞춤 정밀 사주 감정서"}</p>
        <svg className="cover-hanja" viewBox="0 0 3300 1000" role="img" aria-label={BRAND.hanja}>
          <g fill="currentColor">
            <Glyph ch="天" x={0} y={0} w={1000} h={1000} />
            <Glyph ch="機" x={1150} y={0} w={1000} h={1000} />
            <Glyph ch="錄" x={2300} y={0} w={1000} h={1000} />
          </g>
        </svg>
        <p className="cover-tagline">
          하늘이 정해둔 당신의 그릇과 때(時)를 읽다
          <br />
          인생의 전환점을 밝히는 지혜로운 나침반
        </p>
        <p className="cover-years">
          {y1} – {y2}
        </p>
      </div>

      <div className="cover-card">
        <p className="cover-name">
          {clientName(chart)} 님 <span>{chart.input.gender === "male" ? "乾命" : "坤命"}</span>
        </p>
        <p className="cover-pillars" aria-label="사주 팔자(시·일·월·년)">
          {order.map((p, i) => (
            <span key={i}>{p ? `${p.stem}${p.branch}` : "□□"}</span>
          ))}
        </p>
        {intro && <p className="cover-keywords">{intro.coverKeywords.slice(0, 3).join(" · ")}</p>}
        <p className="cover-meta">
          생년월일 {coverBirth(chart)}
          <br />
          발행일자 {KO_DATE(new Date())} · {BRAND.name} 운명연구원 봉정
        </p>
      </div>

      <div className="cover-foot">
        <p>
          天機錄 運命分析室
          <br />
          의뢰인 본인 열람용 비밀 문서 · Strictly Confidential &amp; Personal
        </p>
        <BrandSeal size={84} title={`${BRAND.name} 직인`} />
      </div>
    </section>
  );
}

function Toc({ chart, keys }: { chart: SajuChart; keys: readonly ChapterKey[] }) {
  const years = chart.analysis.reportYears;
  return (
    <section className="toc print-only">
      <h2>목차</h2>
      <ol>
        <li><span>발간사</span></li>
        {keys.map((k) => (
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

export default function ReportView({ chart, aiEnabled, parts, onRetry, afterGrade, include = CHAPTER_KEYS, title }: Props) {
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
      <Cover chart={chart} intro={intro} title={title} />

      <GradeCard chart={chart} />
      {afterGrade}

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

      <Toc chart={chart} keys={include} />

      {!aiEnabled && !afterGrade && (
        <section className="card no-print">
          <h2>항목별 풀이</h2>
          <p className="muted">AI 풀이가 연결되지 않아 계산 결과만 보여 드립니다.</p>
        </section>
      )}

      {include.map((key) => {
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

      <MethodBox chart={chart} hasReading={aiEnabled && include.some((k) => chapterOf(parts, k))} />
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
