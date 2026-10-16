import type { ReactNode } from "react";
import type { SajuChart } from "@/lib/saju/calc";
import { CHAPTER_KEYS, withYears, type Chapter, type ChapterKey, type Intro, type PartKey, type PartResult } from "@/lib/report-shared";
import { AnalysisCard, DaeunCard, ElementCard, LuckyCard, PillarsCard, YearFlowCard } from "./ChartView";
import GradeCard from "./GradeCard";
import BrandSeal, { Glyph } from "./BrandSeal";
import MethodBox from "./MethodBox";
import { getMessages, type Locale, type Messages } from "@/lib/i18n";

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
  /** 화면 언어. 기본 한국어 */
  locale?: Locale;
}

const clientName = (chart: SajuChart, t: Messages) => chart.input.name?.trim() || t.client;
const watermark = (chart: SajuChart, t: Messages) => t.report.watermark(t.brand.name, clientName(chart, t));
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

/** 발행일(해당 지역 시간 기준) */
function issueDate(t: Messages) {
  const k = new Date(Date.now() + t.report.issueOffset * 60_000);
  return { y: k.getUTCFullYear(), m: k.getUTCMonth() + 1, d: k.getUTCDate() };
}

/** 생년월일 줄: "1989년 05월 14일 (양력) 巳時" */
function coverBirth(chart: SajuChart, t: Messages) {
  const [y, m, d] = chart.solarDate.split("-");
  const lunarText = t.chart.lunarDate && chart.lunar ? t.chart.lunarDate(chart.lunar) : chart.lunarDate;
  return t.report.coverBirth({ y, m, d, lunar: chart.input.calendar === "lunar", lunarText, hourBranch: chart.pillars.hour?.branch ?? null });
}

/** PDF 표지(한 쪽 전체). 쪽빛 고서 표지에 이중 테두리, 天機錄 제목, 의뢰인 명식 카드, 낙관 직인. */
function Cover({ chart, intro, title, t }: { chart: SajuChart; intro: Intro | null; title?: string; t: Messages }) {
  const r = t.report;
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
        <p className="cover-sub">{title ?? r.coverSub}</p>
        <svg className="cover-hanja" viewBox="0 0 3300 1000" role="img" aria-label="天機錄">
          <g fill="currentColor">
            <Glyph ch="天" x={0} y={0} w={1000} h={1000} />
            <Glyph ch="機" x={1150} y={0} w={1000} h={1000} />
            <Glyph ch="錄" x={2300} y={0} w={1000} h={1000} />
          </g>
        </svg>
        <p className="cover-tagline">
          {r.coverTagline[0]}
          <br />
          {r.coverTagline[1]}
        </p>
        <p className="cover-years">
          {y1} – {y2}
        </p>
      </div>

      <div className="cover-card">
        <p className="cover-name">
          {r.coverName(clientName(chart, t))} <span>{chart.input.gender === "male" ? "乾命" : "坤命"}</span>
        </p>
        <p className="cover-pillars" aria-label={r.pillarsAria}>
          {order.map((p, i) => (
            <span key={i}>{p ? `${p.stem}${p.branch}` : "□□"}</span>
          ))}
        </p>
        {intro && <p className="cover-keywords">{intro.coverKeywords.slice(0, 3).join(" · ")}</p>}
        <p className="cover-meta">
          {r.coverBirthLabel} {coverBirth(chart, t)}
          <br />
          {r.issued(issueDate(t), t.brand.name)}
        </p>
      </div>

      <div className="cover-foot">
        <p>
          天機錄 運命分析室
          <br />
          {r.coverFoot}
        </p>
        <BrandSeal size={84} title={r.sealTitle(t.brand.name)} />
      </div>
    </section>
  );
}

function Toc({ chart, keys, t }: { chart: SajuChart; keys: readonly ChapterKey[]; t: Messages }) {
  const years = chart.analysis.reportYears;
  return (
    <section className="toc print-only">
      <h2>{t.report.toc}</h2>
      <ol>
        <li><span>{t.report.preface}</span></li>
        {keys.map((k) => (
          <li key={k}>
            <span>{t.chapters[k].label}. {withYears(t.chapters[k].title, years)}</span>
            <small>{t.chapters[k].sections.map((s) => withYears(s, years)).join(" · ")}</small>
          </li>
        ))}
        <li><span>{t.report.methodTitle}</span></li>
      </ol>
    </section>
  );
}

function Pending({ state, onRetry, label, t }: { state: PartState | undefined; onRetry: () => void; label: string; t: Messages }) {
  if (!state || state.status === "loading") {
    return (
      <div className="card loading no-print" aria-live="polite">
        <span className="spinner" aria-hidden /> {t.report.writing(label)}
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="card no-print">
        <p className="error" role="alert">{label}: {state.message}</p>
        <button type="button" className="btn-secondary" onClick={onRetry}>{t.report.retry}</button>
      </div>
    );
  }
  return null;
}

function ChapterText({ chapter, t }: { chapter: Chapter; t: Messages }) {
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
          <h4>{t.report.actionPlan}</h4>
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

export default function ReportView({ chart, aiEnabled, parts, onRetry, afterGrade, include = CHAPTER_KEYS, title, locale }: Props) {
  const t = getMessages(locale);
  const years = chart.analysis.reportYears;
  const intro = introOf(parts);
  const visuals: Partial<Record<ChapterKey, ReactNode>> = {
    part1: (
      <>
        <PillarsCard chart={chart} locale={locale} />
        <ElementCard chart={chart} locale={locale} />
        <AnalysisCard chart={chart} locale={locale} />
      </>
    ),
    part4: <DaeunCard chart={chart} locale={locale} />,
    part5: (
      <>
        <YearFlowCard chart={chart} locale={locale} />
        <LuckyCard chart={chart} locale={locale} />
      </>
    ),
  };

  return (
    <div className="report">
      <Cover chart={chart} intro={intro} title={title} t={t} />

      <GradeCard chart={chart} locale={locale} />
      {afterGrade}

      {aiEnabled && (
        <section className="card preface">
          <h2>{t.report.preface}</h2>
          {intro ? (
            <>
              <p className="summary">{intro.summary}</p>
              {intro.preface.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </>
          ) : (
            <Pending state={parts.intro} onRetry={() => onRetry("intro")} label={t.report.preface} t={t} />
          )}
        </section>
      )}

      <Toc chart={chart} keys={include} t={t} />

      {!aiEnabled && !afterGrade && (
        <section className="card no-print">
          <h2>{t.report.noReadingTitle}</h2>
          <p className="muted">{t.report.noReading}</p>
        </section>
      )}

      {include.map((key) => {
        const meta = t.chapters[key];
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
            {aiEnabled && (chapter ? <ChapterText chapter={chapter} t={t} /> : <Pending state={parts[key]} onRetry={() => onRetry(key)} label={meta.label} t={t} />)}
          </section>
        );
      })}

      <MethodBox chart={chart} hasReading={aiEnabled && include.some((k) => chapterOf(parts, k))} locale={locale} />
      <div className="print-footer print-only">{watermark(chart, t)}</div>
      {/* PDF 각 쪽 하단의 워터마크와 쪽 번호(표지 제외). 이름이 들어가므로 여기서 만든다. */}
      <style>{`@media print {
  @page { @bottom-center { content: ${cssString(watermark(chart, t))}; font-size: 8.5pt; color: #9a978d; }
          @bottom-right { content: counter(page); font-size: 8.5pt; color: #9a978d; } }
  @page :first { @bottom-center { content: none; } @bottom-right { content: none; } }
}`}</style>
    </div>
  );
}
