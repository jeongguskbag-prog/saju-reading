"use client";

import { useState } from "react";
import type { BirthInput, SajuChart } from "@/lib/saju/calc";
import type { Reading } from "@/lib/reading-shared";
import ChartView from "./ChartView";
import ReadingView from "./ReadingView";
import { exportPdf, pdfFileName } from "@/lib/export-pdf";

type ReadingState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; reading: Reading }
  | { status: "error"; message: string };

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "요청에 실패했습니다.");
  return data as T;
}

interface Props {
  aiEnabled: boolean;
  /** 명식 계산. 기본은 서버 API, 앱(APK)에서는 기기 안에서 계산한다. */
  computeChart?: (input: BirthInput) => Promise<SajuChart>;
  /** AI 풀이 요청. 기본은 같은 서버의 /api/reading. */
  requestReading?: (input: BirthInput) => Promise<Reading>;
}

const serverChart = (input: BirthInput) => postJson<{ chart: SajuChart }>("/api/chart", input).then((r) => r.chart);
const serverReading = (input: BirthInput) => postJson<{ reading: Reading }>("/api/reading", input).then((r) => r.reading);

export default function SajuApp({ aiEnabled, computeChart = serverChart, requestReading = serverReading }: Props) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<BirthInput["gender"]>("female");
  const [calendar, setCalendar] = useState<BirthInput["calendar"]>("solar");
  const [isLeapMonth, setIsLeapMonth] = useState(false);
  const [year, setYear] = useState("1995");
  const [month, setMonth] = useState("1");
  const [day, setDay] = useState("1");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [hour, setHour] = useState("12");
  const [minute, setMinute] = useState("0");
  const [solarTimeCorrection, setSolarTimeCorrection] = useState(true);
  const [dayBoundary, setDayBoundary] = useState<"at23" | "at0">("at23");

  const [chart, setChart] = useState<SajuChart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reading, setReading] = useState<ReadingState>({ status: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setReading({ status: "idle" });
    const input: BirthInput = {
      name: name.trim() || undefined,
      gender,
      calendar,
      isLeapMonth: calendar === "lunar" ? isLeapMonth : undefined,
      year: Number(year),
      month: Number(month),
      day: Number(day),
      hour: timeUnknown ? null : Number(hour),
      minute: timeUnknown ? null : Number(minute),
      options: { solarTimeCorrection, dayBoundary },
    };
    setSubmitting(true);
    try {
      setChart(await computeChart(input));
      requestAnimationFrame(() => document.getElementById("result")?.scrollIntoView({ behavior: "smooth" }));
      if (aiEnabled) {
        setReading({ status: "loading" });
        requestReading(input)
          .then((reading) => setReading({ status: "done", reading }))
          .catch((err: Error) => setReading({ status: "error", message: err.message }));
      }
    } catch (err) {
      setChart(null);
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form className="card form-grid no-print" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="name">이름 (선택)</label>
          <input id="name" type="text" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="홍길동" />
        </div>

        <div className="field">
          <span className="label">성별</span>
          <div className="segmented" role="group" aria-label="성별">
            <button type="button" aria-pressed={gender === "female"} onClick={() => setGender("female")}>여성</button>
            <button type="button" aria-pressed={gender === "male"} onClick={() => setGender("male")}>남성</button>
          </div>
        </div>

        <div className="field">
          <span className="label">생년월일</span>
          <div className="segmented" role="group" aria-label="양력 음력" style={{ marginBottom: 8 }}>
            <button type="button" aria-pressed={calendar === "solar"} onClick={() => setCalendar("solar")}>양력</button>
            <button type="button" aria-pressed={calendar === "lunar"} onClick={() => setCalendar("lunar")}>음력</button>
          </div>
          <div className="row">
            <input aria-label="년" type="number" inputMode="numeric" min={1900} max={2100} value={year} onChange={(e) => setYear(e.target.value)} required />
            <select aria-label="월" value={month} onChange={(e) => setMonth(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}월</option>
              ))}
            </select>
            <select aria-label="일" value={day} onChange={(e) => setDay(e.target.value)}>
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}일</option>
              ))}
            </select>
          </div>
          {calendar === "lunar" && (
            <label className="check" style={{ marginTop: 8 }}>
              <input type="checkbox" checked={isLeapMonth} onChange={(e) => setIsLeapMonth(e.target.checked)} /> 윤달
            </label>
          )}
        </div>

        <div className="field">
          <span className="label">태어난 시각</span>
          <div className="row">
            <select aria-label="시" value={hour} disabled={timeUnknown} onChange={(e) => setHour(e.target.value)}>
              {HOURS.map((h) => (
                <option key={h} value={h}>{h}시</option>
              ))}
            </select>
            <select aria-label="분" value={minute} disabled={timeUnknown} onChange={(e) => setMinute(e.target.value)}>
              {MINUTES.map((m) => (
                <option key={m} value={m}>{m}분</option>
              ))}
            </select>
            <label className="check">
              <input type="checkbox" checked={timeUnknown} onChange={(e) => setTimeUnknown(e.target.checked)} /> 모름
            </label>
          </div>
        </div>

        <details className="advanced">
          <summary>계산 옵션</summary>
          <div className="form-grid">
            <label className="check">
              <input type="checkbox" checked={solarTimeCorrection} onChange={(e) => setSolarTimeCorrection(e.target.checked)} />
              진태양시 보정 (서울 기준 약 -32분)
            </label>
            <div className="field">
              <span className="label">자시(23~01시) 출생 일주 기준</span>
              <div className="segmented" role="group" aria-label="자시 일주 기준">
                <button type="button" aria-pressed={dayBoundary === "at23"} onClick={() => setDayBoundary("at23")}>23시에 날짜 변경</button>
                <button type="button" aria-pressed={dayBoundary === "at0"} onClick={() => setDayBoundary("at0")}>자정에 변경(야자시)</button>
              </div>
            </div>
          </div>
        </details>

        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? "계산 중…" : "사주 보기"}
        </button>
        {error && <p className="error" role="alert">{error}</p>}
      </form>

      {chart && (
        <div id="result">
          <p className="print-only print-meta">
            출력일 {new Date().toLocaleDateString("ko-KR")} · {chart.input.gender === "male" ? "남성" : "여성"} ·{" "}
            {chart.input.calendar === "lunar" ? `음력 ${chart.lunarDate}` : `양력 ${chart.solarDate}`}
            {chart.input.hour === null ? " · 시각 모름" : ` ${chart.input.hour}시 ${chart.input.minute ?? 0}분`}
          </p>
          <ChartView chart={chart} />
          <ReadingSection aiEnabled={aiEnabled} state={reading} />
          <div className="result-actions no-print">
            <button
              type="button"
              className="btn-secondary"
              disabled={reading.status === "loading"}
              onClick={() => exportPdf(pdfFileName(chart.input.name, chart.solarDate))}
            >
              PDF로 저장
            </button>
            <p className="muted">
              {reading.status === "loading"
                ? "풀이가 끝나면 풀이까지 포함해 저장할 수 있습니다."
                : "인쇄 화면에서 대상(프린터)을 \u201cPDF로 저장\u201d으로 선택하세요."}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function ReadingSection({ aiEnabled, state }: { aiEnabled: boolean; state: ReadingState }) {
  if (!aiEnabled) {
    return (
      <section className="card">
        <h2>항목별 풀이</h2>
        <p className="muted">AI 풀이가 연결되지 않아 계산 결과만 보여 드립니다.</p>
      </section>
    );
  }
  if (state.status === "loading") {
    return (
      <section className="card" aria-live="polite">
        <h2>항목별 풀이</h2>
        <div className="loading"><span className="spinner" aria-hidden /> 명식을 바탕으로 풀이를 작성하고 있습니다. 30초~1분 정도 걸립니다.</div>
      </section>
    );
  }
  if (state.status === "error") {
    return (
      <section className="card">
        <h2>항목별 풀이</h2>
        <p className="error" role="alert">{state.message}</p>
      </section>
    );
  }
  if (state.status === "done") return <ReadingView reading={state.reading} />;
  return null;
}
