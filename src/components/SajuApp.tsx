"use client";

import { useRef, useState } from "react";
import type { BirthInput, BirthRegion, InputErrorCode, SajuChart } from "@/lib/saju/calc";
import { getMessages, LOCALES, type Locale, type Messages } from "@/lib/i18n";
import { PART_KEYS, type PartKey, type PartResult } from "@/lib/report-shared";
import ReportView, { type PartStates } from "./ReportView";
import YearField from "./YearField";
import ResultActions from "./ResultActions";
import PurchaseBox, { type CheckoutInfo } from "./PurchaseBox";

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

/** 서버 오류. 입력 오류면 code·params가 있어 화면 언어로 다시 쓸 수 있다. */
export class RequestError extends Error {
  constructor(
    message: string,
    readonly code?: InputErrorCode,
    readonly params: Record<string, number> = {},
  ) {
    super(message);
  }
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new RequestError(data.error ?? "요청에 실패했습니다.", data.code, data.params);
  return data as T;
}

/** 오류 문장을 화면 언어로. 코드가 없거나 한국어면 받은 문장 그대로. */
function errorText(err: unknown, t: Messages): string {
  const e = err as { message?: string; code?: InputErrorCode; params?: Record<string, number> };
  if (e.code && t.errors.input) return t.errors.input(e.code, e.params ?? {});
  if (t.errors.input && !e.code) return e.message && /[가-힣]/.test(e.message) ? t.form.requestFailed : (e.message ?? t.form.requestFailed);
  return e.message ?? t.form.requestFailed;
}

interface Props {
  aiEnabled: boolean;
  /** 명식 계산. 기본은 서버 API, 앱(APK)에서는 기기 안에서 계산한다. */
  computeChart?: (input: BirthInput) => Promise<SajuChart>;
  /** 감정서 파트 하나의 AI 풀이 요청. 기본은 같은 서버의 /api/reading. */
  requestPart?: (input: BirthInput, part: PartKey) => Promise<PartResult>;
  /** 웹 판매용: 무료 결과 아래에 구매 상자를 띄운다. aiEnabled(무료 풀이)와 함께 쓰지 않는다. */
  checkout?: CheckoutInfo;
  /** 화면 언어. 출생지 기본값(시간대)도 여기서 정해진다. 기본 한국어 */
  locale?: Locale;
}

const serverChart = (input: BirthInput) => postJson<{ chart: SajuChart }>("/api/chart", input).then((r) => r.chart);
const serverPart = (input: BirthInput, part: PartKey) => postJson<PartResult>("/api/reading", { input, part });

export default function SajuApp({ aiEnabled, computeChart = serverChart, requestPart = serverPart, checkout, locale = "ko" }: Props) {
  const t = getMessages(locale);
  const f = t.form;
  const [region, setRegion] = useState<BirthRegion>(LOCALES[locale].region);
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
    const dateError = checkBirthDate(year, Number(month), Number(day), calendar, t);
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
      // 한국어 화면은 예전과 같은 입력(지역 미지정 = 한국)을 보낸다.
      options: region === "KR" && locale === "ko" ? { solarTimeCorrection, dayBoundary } : { solarTimeCorrection, dayBoundary, region },
    };
    setSubmitting(true);
    try {
      const computed = await computeChart(input);
      lastInput.current = input;
      setChart(computed);
      requestAnimationFrame(() => document.getElementById("result")?.scrollIntoView({ behavior: "smooth" }));
      if (aiEnabled) PART_KEYS.forEach((part) => loadPart(input, part, runId));
    } catch (err) {
      setChart(null);
      setError(errorText(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form className="card form-grid no-print" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="name">{f.name}</label>
          <input id="name" type="text" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder={f.namePlaceholder} />
        </div>

        <div className="field">
          <span className="label">{f.gender}</span>
          <div className="segmented" role="group" aria-label={f.gender}>
            <button type="button" aria-pressed={gender === "female"} onClick={() => setGender("female")}>{f.female}</button>
            <button type="button" aria-pressed={gender === "male"} onClick={() => setGender("male")}>{f.male}</button>
          </div>
        </div>

        <div className="field">
          <span className="label">{f.birthDate}</span>
          <div className="segmented" role="group" aria-label={f.calendarAria} style={{ marginBottom: 8 }}>
            <button type="button" aria-pressed={calendar === "solar"} onClick={() => setCalendar("solar")}>{f.solar}</button>
            <button type="button" aria-pressed={calendar === "lunar"} onClick={() => setCalendar("lunar")}>{f.lunar}</button>
          </div>
          <div className="row">
            <YearField value={year} onChange={setYear} locale={locale} />
            <select aria-label={f.monthAria} value={month} onChange={(e) => setMonth(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{f.month(i + 1)}</option>
              ))}
            </select>
            <select aria-label={f.dayAria} value={day} onChange={(e) => setDay(e.target.value)}>
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{f.day(i + 1)}</option>
              ))}
            </select>
          </div>
          {calendar === "lunar" && (
            <label className="check" style={{ marginTop: 8 }}>
              <input type="checkbox" checked={isLeapMonth} onChange={(e) => setIsLeapMonth(e.target.checked)} /> {f.leapMonth}
            </label>
          )}
        </div>

        <div className="field">
          <span className="label">{f.birthTime}</span>
          <div className="row">
            <select aria-label={f.hourAria} value={hour} disabled={timeUnknown} onChange={(e) => setHour(e.target.value)}>
              {HOURS.map((h) => (
                <option key={h} value={h}>{f.hour(h)}</option>
              ))}
            </select>
            <select aria-label={f.minuteAria} value={minute} disabled={timeUnknown} onChange={(e) => setMinute(e.target.value)}>
              {MINUTES.map((m) => (
                <option key={m} value={m}>{f.minute(m)}</option>
              ))}
            </select>
            <label className="check">
              <input type="checkbox" checked={timeUnknown} onChange={(e) => setTimeUnknown(e.target.checked)} /> {f.unknown}
            </label>
          </div>
        </div>

        {f.showRegion && (
          <div className="field">
            <label htmlFor="region">{f.region}</label>
            <select id="region" value={region} onChange={(e) => setRegion(e.target.value as BirthRegion)}>
              {(Object.keys(f.regions) as BirthRegion[]).map((r) => (
                <option key={r} value={r}>{f.regions[r]}</option>
              ))}
            </select>
          </div>
        )}

        <details className="advanced">
          <summary>{f.advanced}</summary>
          <div className="form-grid">
            <label className="check">
              <input type="checkbox" checked={solarTimeCorrection} onChange={(e) => setSolarTimeCorrection(e.target.checked)} />
              {f.solarCorrection(region)}
            </label>
            <div className="field">
              <span className="label">{f.dayBoundary}</span>
              <div className="segmented" role="group" aria-label={f.dayBoundaryAria}>
                <button type="button" aria-pressed={dayBoundary === "at23"} onClick={() => setDayBoundary("at23")}>{f.at23}</button>
                <button type="button" aria-pressed={dayBoundary === "at0"} onClick={() => setDayBoundary("at0")}>{f.at0}</button>
              </div>
            </div>
          </div>
        </details>

        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? f.submitting : f.submit}
        </button>
        {error && <p className="error" role="alert">{error}</p>}
      </form>

      {chart && (
        <div id="result">
          <ReportView
            chart={chart}
            locale={locale}
            aiEnabled={aiEnabled}
            parts={parts}
            onRetry={(part) => lastInput.current && loadPart(lastInput.current, part, run.current)}
            afterGrade={checkout && !aiEnabled && lastInput.current ? <PurchaseBox input={lastInput.current} checkout={checkout} years={chart.analysis.reportYears} /> : undefined}
          />
          <ResultActions chart={chart} busy={anyLoading} locale={locale} />
        </div>
      )}
    </>
  );
}

/** 제출 전 빠른 확인. 음력의 미래 날짜는 양력 변환이 필요해 계산 단계에서 다시 확인한다. */
function checkBirthDate(year: string, month: number, day: number, calendar: BirthInput["calendar"], t: Messages): string | null {
  if (!/^\d{4}$/.test(year)) return t.errors.year4;
  const y = Number(year);
  if (y < 1900) return t.errors.before1900;
  if (calendar === "solar") {
    const now = new Date();
    const todayKey = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    if (y * 10000 + month * 100 + day > todayKey) return t.errors.future;
  } else if (y > new Date().getFullYear()) {
    return t.errors.future;
  }
  return null;
}
