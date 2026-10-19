"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { BirthInput, SajuChart } from "@/lib/saju/calc";
import { CHAPTER_KEYS, PART_KEYS, type ChapterKey, type PartKey, type PartResult } from "@/lib/report-shared";
import { DEFAULT_PRODUCT, PRODUCTS, type ProductId } from "@/lib/product";
import AppProducts, { productCopy } from "./AppProducts";
import NamingFields, { emptyNamingForm, toNamingRequest, type NamingForm } from "./NamingFields";
import NamingReport from "./NamingReport";
import AppExtraFields, { emptyExtraForms, toExtraRequest, type ExtraForms } from "./extras/AppExtraFields";
import ExtraReport from "./extras/ExtraReport";
import { isExtraKind, type ExtraKind } from "@/lib/extras/kinds";
import ReportView, { type PartStates } from "./ReportView";
import YearField from "./YearField";
import ResultActions from "./ResultActions";
import ShareTypeCard from "./ShareTypeCard";
import MemberSaveBar from "./MemberSaveBar";
import PurchaseBox, { type CheckoutInfo } from "./PurchaseBox";
import { useLocale, useT } from "./LocaleProvider";
import { messages, type Messages } from "@/lib/messages";
import type { Region } from "@/lib/saju/locale";
import { CN_CITIES } from "@/lib/cn-cities";

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

async function postJson<T>(url: string, body: unknown, t: Messages): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // Android 앱에서는 앱 접근 키를 함께 보내 결제 없이 풀이를 받는다(/app 화면).
  const appKey = typeof window !== "undefined" ? window.AndroidBridge?.appKey?.() : undefined;
  if (appKey) headers["x-app-key"] = appKey;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? t.requestFailed);
  return data as T;
}

interface Props {
  aiEnabled: boolean;
  /** 웹 판매용: 무료 결과 아래에 구매 상자를 띄운다. aiEnabled(무료 풀이)와 함께 쓰지 않는다. */
  checkout?: CheckoutInfo;
  /** 고를 수 있는 출생 지역. 둘 이상이면 지역 선택 칸을 보인다. 기본 한국만. */
  regions?: Region[];
  /** 앱 전용 화면(한국어): 웹처럼 감정서를 고르게 하고, 고른 감정서의 파트만 무료로 작성한다. */
  productChoice?: boolean;
  /** 결제 상자가 없을 때 등급 카드 아래에 넣을 안내(해외 화면의 "감정서 준비 중" 등) */
  afterGrade?: ReactNode;
  /** 미리 채울 입력(마이에 저장한 사주 보기) */
  initial?: BirthInput;
  /** initial이 있을 때 화면을 열자마자 결과를 보여 준다 */
  autoRun?: boolean;
  /** 결과 위에 '마이에 저장' 띠를 보인다(한국어 웹, 회원 기능이 켜졌을 때만 실제로 보인다) */
  memberSave?: boolean;
}

const serverChart = (input: BirthInput, t: Messages) => postJson<{ chart: SajuChart }>("/api/chart", input, t).then((r) => r.chart);
const serverPart = (input: BirthInput, part: PartKey, t: Messages) =>
  postJson<PartResult>("/api/reading", { input, part, locale: input.locale }, t);
/** 앱 화면의 작명록. 신청서(성씨·돌림자 등)를 함께 보낸다. */
const serverNaming = (input: BirthInput, naming: unknown, t: Messages) =>
  postJson<PartResult>("/api/reading", { input, part: "naming", naming, locale: input.locale }, t);

export default function SajuApp({ aiEnabled, checkout, regions = ["KR"], productChoice = false, afterGrade, initial, autoRun = false, memberSave = false }: Props) {
  const t = useT();
  const locale = useLocale();
  const [region, setRegion] = useState<Region>(initial?.region && regions.includes(initial.region) ? initial.region : regions[0]);
  const [productId, setProductId] = useState<ProductId>(DEFAULT_PRODUCT);
  // 제출할 때 고른 감정서. 결과를 보는 중에 다른 카드를 눌러도 이미 받은 감정서 구성은 바뀌지 않는다.
  const [shownProduct, setShownProduct] = useState<ProductId | null>(null);
  // 작명록 신청서(앱 화면에서 작명록을 골랐을 때만 보인다).
  const [namingForm, setNamingForm] = useState<NamingForm>(emptyNamingForm);
  const lastNaming = useRef<unknown>(null);
  const isNaming = productChoice && productId === "naming";
  // 추가 상품(궁합·신년 운세·택일·주역 점·자미두수) 신청서. 웹 결제 칸과 같은 입력 부품을 쓴다.
  const [extraForms, setExtraForms] = useState<ExtraForms>(() => emptyExtraForms("female"));
  const lastExtra = useRef<unknown>(null);
  const extraKind: ExtraKind | null = productChoice && isExtraKind(productId) ? productId : null;
  // 중국 대륙은 전국이 한 표준시라 출생 도시 경도로 진태양시를 맞춘다.
  const [cityIndex, setCityIndex] = useState(() => {
    const i = CN_CITIES.findIndex((c) => c.longitude === initial?.options?.longitude);
    return i < 0 ? 0 : i;
  });
  const [name, setName] = useState(initial?.name ?? "");
  // 성별·생년월일·시각은 비워 두고 시작한다(미리 채운 값으로 결과가 나오지 않게). 빠진 칸은 제출할 때 알린다.
  // 마이에 저장한 사주를 볼 때만 저장한 값으로 채운다.
  const [gender, setGender] = useState<BirthInput["gender"] | "">(initial?.gender ?? "");
  const [calendar, setCalendar] = useState<BirthInput["calendar"]>(initial?.calendar ?? "solar");
  const [isLeapMonth, setIsLeapMonth] = useState(Boolean(initial?.isLeapMonth));
  const [year, setYear] = useState(initial ? String(initial.year) : "");
  const [month, setMonth] = useState(initial ? String(initial.month) : "");
  const [day, setDay] = useState(initial ? String(initial.day) : "");
  const [timeUnknown, setTimeUnknown] = useState(initial ? initial.hour === null : false);
  const [hour, setHour] = useState(initial && initial.hour !== null ? String(initial.hour) : "");
  const [minute, setMinute] = useState(initial && initial.hour !== null ? String(initial.minute ?? 0) : "");
  const [solarTimeCorrection, setSolarTimeCorrection] = useState(initial?.options?.solarTimeCorrection ?? true);
  const [dayBoundary, setDayBoundary] = useState<"at23" | "at0">(initial?.options?.dayBoundary ?? "at23");
  // 결혼·자녀(선택, 한국어 화면). 애정·가족 풀이를 상황에 맞추는 데만 쓴다. 같은 버튼을 다시 누르면 선택이 풀린다.
  const [marital, setMarital] = useState<"" | "married" | "dating" | "single">(initial?.life?.marital ?? "");
  const [children, setChildren] = useState<"" | "yes" | "no">(initial?.life?.children === undefined ? "" : initial.life.children ? "yes" : "no");
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (autoRun && initial) formRef.current?.requestSubmit();
    // 화면을 처음 열 때 한 번만
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [chart, setChart] = useState<SajuChart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [parts, setParts] = useState<PartStates>({});
  const lastInput = useRef<BirthInput | null>(null);
  // 새로 제출하면 이전 요청의 늦은 응답이 화면을 덮어쓰지 않도록 회차를 센다.
  const run = useRef(0);

  function loadPart(input: BirthInput, part: PartKey, runId: number) {
    setParts((prev) => ({ ...prev, [part]: { status: "loading" } }));
    serverPart(input, part, t)
      .then((result) => run.current === runId && setParts((prev) => ({ ...prev, [part]: { status: "done", result } })))
      .catch((err: Error) => run.current === runId && setParts((prev) => ({ ...prev, [part]: { status: "error", message: err.message } })));
  }

  function loadNaming(input: BirthInput, naming: unknown, runId: number) {
    setParts((prev) => ({ ...prev, naming: { status: "loading" } }));
    serverNaming(input, naming, t)
      .then((result) => run.current === runId && setParts((prev) => ({ ...prev, naming: { status: "done", result } })))
      .catch((err: Error) => run.current === runId && setParts((prev) => ({ ...prev, naming: { status: "error", message: err.message } })));
  }

  /** 앱 화면의 추가 상품. 신청서를 함께 보낸다. */
  function loadExtra(input: BirthInput, kind: ExtraKind, extra: unknown, runId: number) {
    setParts((prev) => ({ ...prev, [kind]: { status: "loading" } }));
    postJson<PartResult>("/api/reading", { input, part: kind, extra, locale: input.locale }, t)
      .then((result) => run.current === runId && setParts((prev) => ({ ...prev, [kind]: { status: "done", result } })))
      .catch((err: Error) => run.current === runId && setParts((prev) => ({ ...prev, [kind]: { status: "error", message: err.message } })));
  }

  const anyLoading = Object.values(parts).some((p) => p?.status === "loading");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setParts({});
    const runId = ++run.current;
    // 빠진 칸을 한 번에 알려 준다. 작명록은 아기 이름이 아직 없을 수 있어 성함을 묻지 않는다.
    const missing = [
      !isNaming && !name.trim() && t.needName,
      !gender && t.needGender,
      (!year || !month || !day) && t.needDate,
      !timeUnknown && !hour && t.needTime,
    ].filter((x): x is string => Boolean(x));
    if (missing.length) {
      setChart(null);
      setError(t.needFields(missing));
      return;
    }
    const dateError = checkBirthDate(year, Number(month), Number(day), calendar, t);
    if (dateError) {
      setChart(null);
      setError(dateError);
      return;
    }
    let namingReq: unknown = null;
    if (isNaming) {
      const r = toNamingRequest(namingForm);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      namingReq = r.value;
    }
    let extraReq: unknown = null;
    if (extraKind) {
      const r = toExtraRequest(extraKind, extraForms, !timeUnknown);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      extraReq = r.value;
    }
    const input: BirthInput = {
      name: name.trim() || undefined,
      gender: gender as BirthInput["gender"],
      calendar,
      isLeapMonth: calendar === "lunar" ? isLeapMonth : undefined,
      year: Number(year),
      month: Number(month),
      day: Number(day),
      hour: timeUnknown ? null : Number(hour),
      minute: timeUnknown ? null : Number(minute || 0),
      // 한국어 웹은 예전과 같은 요청 모양을 유지한다.
      ...(locale === "ko" ? {} : { locale }),
      ...(region === "KR" ? {} : { region }),
      ...(locale === "ko" && (marital || children)
        ? { life: { ...(marital ? { marital } : {}), ...(children ? { children: children === "yes" } : {}) } }
        : {}),
      options: { solarTimeCorrection, dayBoundary, ...(region === "CN" ? { longitude: CN_CITIES[cityIndex].longitude } : {}) },
    };
    setSubmitting(true);
    try {
      const computed = await serverChart(input, t);
      lastInput.current = input;
      setChart(computed);
      requestAnimationFrame(() => document.getElementById("result")?.scrollIntoView({ behavior: "smooth" }));
      if (productChoice) setShownProduct(productId);
      if (isNaming) {
        lastNaming.current = namingReq;
        if (aiEnabled) loadNaming(input, namingReq, runId);
        else setParts({ naming: { status: "error", message: t.noAi } });
      } else if (extraKind) {
        lastExtra.current = extraReq;
        if (aiEnabled) loadExtra(input, extraKind, extraReq, runId);
        else setParts({ [extraKind]: { status: "error", message: t.noAi } });
      } else {
        const partKeys = productChoice ? PRODUCTS[productId].parts.filter((p): p is PartKey => p !== "naming") : PART_KEYS;
        if (aiEnabled) partKeys.forEach((part) => loadPart(input, part, runId));
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
      {productChoice && (
        <AppProducts value={productId} onChange={setProductId} years={[new Date().getFullYear(), new Date().getFullYear() + 1]} />
      )}
      <form id="saju-form" ref={formRef} className="card form-grid no-print" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="name">{t.nameLabel}</label>
          <input id="name" type="text" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} />
        </div>

        {region === "CN" && (
          <div className="field">
            <label htmlFor="birth-city">{t.birthCity}</label>
            <select id="birth-city" value={cityIndex} onChange={(e) => setCityIndex(Number(e.target.value))}>
              {CN_CITIES.map((c, i) => (
                <option key={c.name} value={i}>{locale === "en" ? `${c.en} ${c.name}` : c.name}</option>
              ))}
            </select>
          </div>
        )}

        {regions.length > 1 && (
          <div className="field">
            <span className="label">{t.region}</span>
            <div className="segmented" role="group" aria-label={t.region}>
              {regions.map((r) => (
                <button key={r} type="button" aria-pressed={region === r} onClick={() => setRegion(r)}>{t.regionName(r)}</button>
              ))}
            </div>
          </div>
        )}

        <div className="field">
          <span className="label">{t.gender}</span>
          <div className="segmented" role="group" aria-label={t.gender}>
            <button type="button" aria-pressed={gender === "female"} onClick={() => setGender("female")}>{t.female}</button>
            <button type="button" aria-pressed={gender === "male"} onClick={() => setGender("male")}>{t.male}</button>
          </div>
        </div>

        <div className="field">
          <span className="label">{t.birthDate}</span>
          <div className="segmented" role="group" aria-label={t.calendarGroup} style={{ marginBottom: 8 }}>
            <button type="button" aria-pressed={calendar === "solar"} onClick={() => setCalendar("solar")}>{t.solar}</button>
            <button type="button" aria-pressed={calendar === "lunar"} onClick={() => setCalendar("lunar")}>{t.lunar}</button>
          </div>
          <div className="row">
            <YearField value={year} onChange={setYear} />
            <select aria-label={t.monthAria} value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="" disabled>{t.monthAria}</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{t.monthOption(i + 1)}</option>
              ))}
            </select>
            <select aria-label={t.dayAria} value={day} onChange={(e) => setDay(e.target.value)}>
              <option value="" disabled>{t.dayAria}</option>
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{t.dayOption(i + 1)}</option>
              ))}
            </select>
          </div>
          {calendar === "lunar" && (
            <label className="check" style={{ marginTop: 8 }}>
              <input type="checkbox" checked={isLeapMonth} onChange={(e) => setIsLeapMonth(e.target.checked)} /> {t.leapMonth}
            </label>
          )}
        </div>

        <div className="field">
          <span className="label">{t.birthTime}</span>
          <div className="row">
            <select
              aria-label={t.hourAria}
              value={hour}
              disabled={timeUnknown}
              // 시를 고르면 분은 0분으로 채운다(분까지 모르는 분이 많다). 필요하면 바꾸면 된다.
              onChange={(e) => {
                setHour(e.target.value);
                if (!minute) setMinute("0");
              }}
            >
              <option value="" disabled>{t.hourAria}</option>
              {HOURS.map((h) => (
                <option key={h} value={h}>{t.hourOption(h)}</option>
              ))}
            </select>
            <select aria-label={t.minuteAria} value={minute} disabled={timeUnknown} onChange={(e) => setMinute(e.target.value)}>
              <option value="" disabled>{t.minuteAria}</option>
              {MINUTES.map((m) => (
                <option key={m} value={m}>{t.minuteOption(m)}</option>
              ))}
            </select>
            <label className="check">
              <input type="checkbox" checked={timeUnknown} onChange={(e) => setTimeUnknown(e.target.checked)} /> {t.unknown}
            </label>
          </div>
        </div>

        {locale === "ko" && (
          <div className="field life-fields">
            <span className="label">결혼·자녀 <span className="muted">(선택)</span></span>
            <div className="life-row">
              <div>
                <span className="sublabel">결혼 여부</span>
                <div className="segmented" role="group" aria-label="결혼 여부">
                  {([["married", "기혼"], ["dating", "연애"], ["single", "싱글"]] as const).map(([v, l]) => (
                    <button key={v} type="button" aria-pressed={marital === v} onClick={() => setMarital(marital === v ? "" : v)}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <span className="sublabel">자녀 여부</span>
                <div className="segmented" role="group" aria-label="자녀 여부">
                  {([["yes", "있음"], ["no", "없음"]] as const).map(([v, l]) => (
                    <button key={v} type="button" aria-pressed={children === v} onClick={() => setChildren(children === v ? "" : v)}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
            <p className="muted">알려 주시면 감정서의 애정·가족 풀이와 생활 조언을 상황에 맞춰 드립니다. 명식 계산에는 쓰지 않습니다.</p>
          </div>
        )}

        <details className="advanced">
          <summary>{t.calcOptions}</summary>
          <div className="form-grid">
            <label className="check">
              <input type="checkbox" checked={solarTimeCorrection} onChange={(e) => setSolarTimeCorrection(e.target.checked)} />
              {t.solarCorrection(region)}
            </label>
            <div className="field">
              <span className="label">{t.ziHour}</span>
              <div className="segmented" role="group" aria-label={t.ziHourAria}>
                <button type="button" aria-pressed={dayBoundary === "at23"} onClick={() => setDayBoundary("at23")}>{t.at23}</button>
                <button type="button" aria-pressed={dayBoundary === "at0"} onClick={() => setDayBoundary("at0")}>{t.at0}</button>
              </div>
            </div>
          </div>
        </details>

        {isNaming && <NamingFields value={namingForm} onChange={setNamingForm} />}
        {extraKind && <AppExtraFields kind={extraKind} value={extraForms} onChange={setExtraForms} hourKnown={!timeUnknown} />}

        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? t.submitting : t.submit}
        </button>
        {error && <p className="error" role="alert">{error}</p>}
      </form>

      {chart && shownProduct === "naming" && (
        <div id="result">
          <NamingReport
            chart={chart}
            parts={parts}
            onRetry={() => lastInput.current && loadNaming(lastInput.current, lastNaming.current, run.current)}
            title={productCopy(t, "naming").name}
          />
          <ResultActions chart={chart} busy={anyLoading} />
        </div>
      )}

      {chart && shownProduct && isExtraKind(shownProduct) && (
        <div id="result">
          <ExtraReport
            kind={shownProduct}
            chart={chart}
            parts={parts}
            onRetry={() => lastInput.current && loadExtra(lastInput.current, shownProduct, lastExtra.current, run.current)}
            title={productCopy(t, shownProduct).name}
          />
          <ResultActions chart={chart} busy={anyLoading} />
        </div>
      )}

      {chart && shownProduct !== "naming" && !(shownProduct && isExtraKind(shownProduct)) && (
        <div id="result">
          {memberSave && lastInput.current && <MemberSaveBar input={lastInput.current} />}
          <ReportView
            chart={chart}
            aiEnabled={aiEnabled}
            parts={parts}
            onRetry={(part) => lastInput.current && loadPart(lastInput.current, part, run.current)}
            afterGrade={
              checkout && !aiEnabled && lastInput.current ? (
                <>
                  {locale === "ko" && <ShareTypeCard chart={chart} />}
                  <PurchaseBox input={lastInput.current} checkout={checkout} years={chart.analysis.reportYears} />
                </>
              ) : (
                afterGrade
              )
            }
            {...(productChoice && shownProduct
              ? {
                  include: CHAPTER_KEYS.filter((k): k is ChapterKey => PRODUCTS[shownProduct].parts.includes(k)),
                  title: productCopy(t, shownProduct).name,
                }
              : {})}
          />
          <ResultActions chart={chart} busy={anyLoading} />
        </div>
      )}
    </>
  );
}

/** 제출 전 빠른 확인. 음력의 미래 날짜는 양력 변환이 필요해 계산 단계에서 다시 확인한다. */
function checkBirthDate(year: string, month: number, day: number, calendar: BirthInput["calendar"], t: Messages = messages()): string | null {
  if (!/^\d{4}$/.test(year)) return t.yearFourDigits;
  const y = Number(year);
  if (y < 1900) return t.yearMin;
  if (calendar === "solar") {
    const now = new Date();
    const todayKey = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    if (y * 10000 + month * 100 + day > todayKey) return t.futureDate;
  } else if (y > new Date().getFullYear()) {
    return t.futureDate;
  }
  return null;
}
