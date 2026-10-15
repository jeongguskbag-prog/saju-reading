"use client";

import { useRef, useState } from "react";
import type { BirthInput, SajuChart } from "@/lib/saju/calc";
import { PART_KEYS, type PartKey, type PartResult } from "@/lib/report-shared";
import ReportView, { type PartStates } from "./ReportView";
import YearField from "./YearField";
import { buildResultHtml, exportHtml, exportPdf, resultFileName } from "@/lib/export";

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
  /** 감정서 파트 하나의 AI 풀이 요청. 기본은 같은 서버의 /api/reading. */
  requestPart?: (input: BirthInput, part: PartKey) => Promise<PartResult>;
}

const serverChart = (input: BirthInput) => postJson<{ chart: SajuChart }>("/api/chart", input).then((r) => r.chart);
const serverPart = (input: BirthInput, part: PartKey) => postJson<PartResult>("/api/reading", { input, part });

export default function SajuApp({ aiEnabled, computeChart = serverChart, requestPart = serverPart }: Props) {
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
  const [parts, setParts] = useState<PartStates>({});
  const lastInput = useRef<BirthInput | null>(null);
  // 새로 제출하면 이전 요청의 늦은 응답이 화면을 덮어쓰지 않도록 회차를 센다.
  const run = useRef(0);

  function loadPart(input: BirthInput, part: PartKey, runId: number) {
    setParts((prev) => ({ ...prev, [part]: { status: "loading" } }));
    requestPart(input, part)
      .then((result) => run.current === runId && setParts((prev) => ({ ...prev, [part]: { status: "done", result } })))
      .catch((err: Error) => run.current === runId && setParts((prev) => ({ ...prev, [part]: { status: "error", message: err.message } })));
  }

  const anyLoading = Object.values(parts).some((p) => p?.status === "loading");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setParts({});
    const runId = ++run.current;
    const dateError = checkBirthDate(year, Number(month), Number(day), calendar);
    if (dateError) {
      setChart(null);
      setError(dateError);
      return;
    }
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
      lastInput.current = input;
      if (aiEnabled) PART_KEYS.forEach((part) => loadPart(input, part, runId));
    } catch (err) {
      setChart(null);
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form className="card form-grid no-print" onSubmit={onSubmit} noValidate>
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
            <YearField value={year} onChange={setYear} />
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
          <ReportView
            chart={chart}
            aiEnabled={aiEnabled}
            parts={parts}
            onRetry={(part) => lastInput.current && loadPart(lastInput.current, part, run.current)}
          />
          <div className="result-actions no-print">
            <div className="action-buttons">
              <button
                type="button"
                className="btn-secondary"
                disabled={anyLoading}
                onClick={() => exportPdf(resultFileName(chart.input.name, chart.solarDate))}
              >
                PDF로 저장
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={anyLoading}
                onClick={() => {
                  const fileName = resultFileName(chart.input.name, chart.solarDate);
                  const result = document.getElementById("result");
                  if (result) exportHtml(fileName, `saju-result_${chart.solarDate}`, buildResultHtml(result, fileName));
                }}
              >
                HTML로 저장
              </button>
            </div>
            <p className="muted">
              {anyLoading
                ? "풀이가 끝나면 풀이까지 포함해 저장할 수 있습니다."
                : "PDF는 인쇄 화면에서 \u201cPDF로 저장\u201d을 고르세요. PDF를 못 여는 분께는 HTML 파일을 보내 주세요(인터넷 브라우저로 열림)."}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

/** 제출 전 빠른 확인. 음력의 미래 날짜는 양력 변환이 필요해 계산 단계에서 다시 확인한다. */
function checkBirthDate(year: string, month: number, day: number, calendar: BirthInput["calendar"]): string | null {
  if (!/^\d{4}$/.test(year)) return "연도는 네 자리 숫자로 입력해 주세요. (예: 1990)";
  const y = Number(year);
  if (y < 1900) return "1900년 이후 날짜만 계산할 수 있습니다.";
  if (calendar === "solar") {
    const now = new Date();
    const todayKey = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    if (y * 10000 + month * 100 + day > todayKey) return "생년월일이 오늘 이후입니다. 날짜를 다시 확인해 주세요.";
  } else if (y > new Date().getFullYear()) {
    return "생년월일이 오늘 이후입니다. 날짜를 다시 확인해 주세요.";
  }
  return null;
}
