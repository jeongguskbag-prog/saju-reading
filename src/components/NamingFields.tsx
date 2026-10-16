"use client";

import { FEELINGS, FEELING_LABEL, SURNAMES, type Feeling } from "@/lib/naming/request";

export interface NamingForm {
  mode: "baby" | "rename";
  surname: string;
  surnameHanja: string;
  /** 목록에 없는 성씨를 직접 적는지 */
  customSurname: boolean;
  useGeneration: boolean;
  genHanja: string;
  genReading: string;
  genPosition: "first" | "second";
  feelings: Feeling[];
  currentHangul: string;
  currentHanja: string;
}

export const emptyNamingForm = (): NamingForm => ({
  mode: "baby",
  surname: "김",
  surnameHanja: "金",
  customSurname: false,
  useGeneration: false,
  genHanja: "",
  genReading: "",
  genPosition: "second",
  feelings: [],
  currentHangul: "",
  currentHanja: "",
});

/** 신청서 → 서버에 보낼 작명 요청. 빠진 칸이 있으면 오류 문장. */
export function toNamingRequest(f: NamingForm): { ok: true; value: unknown } | { ok: false; error: string } {
  const surname = f.surname.trim();
  const surnameHanja = f.surnameHanja.trim();
  if (!/^[가-힣]{1,2}$/.test(surname) || [...surnameHanja].length !== [...surname].length) {
    return { ok: false, error: "성씨의 한글과 한자를 확인해 주세요. (예: 김 / 金)" };
  }
  if (f.useGeneration && (!f.genHanja.trim() || !/^[가-힣]$/.test(f.genReading.trim()))) {
    return { ok: false, error: "돌림자의 한자와 음(한 글자)을 적어 주세요. (예: 俊 / 준)" };
  }
  if (f.mode === "rename" && !/^[가-힣]{1,3}$/.test(f.currentHangul.trim())) {
    return { ok: false, error: "개명은 지금 이름(성을 뺀 이름)을 한글로 적어 주세요." };
  }
  return {
    ok: true,
    value: {
      mode: f.mode,
      surname,
      surnameHanja,
      generation: f.useGeneration ? { hanja: f.genHanja.trim(), reading: f.genReading.trim(), position: f.genPosition } : null,
      feelings: f.feelings,
      currentName: f.mode === "rename" ? { hangul: f.currentHangul.trim(), ...(f.currentHanja.trim() ? { hanja: f.currentHanja.trim() } : {}) } : null,
    },
  };
}

/** 길운 개운 작명록 신청서: 작명/개명, 성씨, 돌림자, 원하는 느낌, 지금 이름(개명). */
export default function NamingFields({ value: f, onChange }: { value: NamingForm; onChange: (f: NamingForm) => void }) {
  const set = (patch: Partial<NamingForm>) => onChange({ ...f, ...patch });
  const choices = SURNAMES.find((s) => s.hangul === f.surname)?.hanja ?? [];
  return (
    <fieldset className="naming-fields">
      <legend className="label">작명 신청서</legend>
      <p className="muted">위에 넣은 생년월일시의 사주로 이름을 짓습니다. 아기 이름이면 아기의 생년월일시를 넣어 주세요.</p>

      <div className="segmented" role="group" aria-label="작명 종류">
        <button type="button" aria-pressed={f.mode === "baby"} onClick={() => set({ mode: "baby" })}>아기 이름 짓기</button>
        <button type="button" aria-pressed={f.mode === "rename"} onClick={() => set({ mode: "rename" })}>개명</button>
      </div>

      <div className="field">
        <span className="label">성씨</span>
        {f.customSurname ? (
          <div className="row">
            <input aria-label="성씨 한글" value={f.surname} maxLength={2} onChange={(e) => set({ surname: e.target.value })} placeholder="한글 (예: 독고)" />
            <input aria-label="성씨 한자" value={f.surnameHanja} maxLength={2} onChange={(e) => set({ surnameHanja: e.target.value })} placeholder="한자 (예: 獨孤)" />
          </div>
        ) : (
          <div className="row">
            <select
              aria-label="성씨"
              value={f.surname}
              onChange={(e) => {
                const s = SURNAMES.find((x) => x.hangul === e.target.value);
                set({ surname: e.target.value, surnameHanja: s?.hanja[0] ?? "" });
              }}
            >
              {SURNAMES.map((s) => (
                <option key={s.hangul} value={s.hangul}>{s.hangul}</option>
              ))}
            </select>
            <select aria-label="성씨 한자" value={f.surnameHanja} onChange={(e) => set({ surnameHanja: e.target.value })}>
              {choices.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        )}
        <label className="check">
          <input type="checkbox" checked={f.customSurname} onChange={(e) => set({ customSurname: e.target.checked })} /> 목록에 없는 성씨를 직접 적기
        </label>
      </div>

      {f.mode === "rename" && (
        <div className="field">
          <span className="label">지금 이름 (성을 뺀 이름)</span>
          <div className="row">
            <input aria-label="지금 이름 한글" value={f.currentHangul} maxLength={3} onChange={(e) => set({ currentHangul: e.target.value })} placeholder="한글 (예: 민수)" />
            <input aria-label="지금 이름 한자" value={f.currentHanja} maxLength={3} onChange={(e) => set({ currentHanja: e.target.value })} placeholder="한자 (모르면 비움)" />
          </div>
        </div>
      )}

      <div className="field">
        <label className="check">
          <input type="checkbox" checked={f.useGeneration} onChange={(e) => set({ useGeneration: e.target.checked })} /> 돌림자(항렬자)를 넣을게요
        </label>
        {f.useGeneration && (
          <div className="row">
            <input aria-label="돌림자 한자" value={f.genHanja} maxLength={1} onChange={(e) => set({ genHanja: e.target.value })} placeholder="한자 (예: 俊)" />
            <input aria-label="돌림자 음" value={f.genReading} maxLength={1} onChange={(e) => set({ genReading: e.target.value })} placeholder="음 (예: 준)" />
          </div>
        )}
        {f.useGeneration && (
          <div className="row">
            <select aria-label="돌림자 자리" value={f.genPosition} onChange={(e) => set({ genPosition: e.target.value as "first" | "second" })}>
              <option value="first">이름 첫째 자리</option>
              <option value="second">이름 둘째 자리</option>
            </select>
          </div>
        )}
      </div>

      <div className="field">
        <span className="label">원하는 느낌 (3개까지)</span>
        <div className="chip-row">
          {FEELINGS.map((x) => {
            const on = f.feelings.includes(x);
            return (
              <button
                key={x}
                type="button"
                className="chip"
                aria-pressed={on}
                disabled={!on && f.feelings.length >= 3}
                onClick={() => set({ feelings: on ? f.feelings.filter((y) => y !== x) : [...f.feelings, x] })}
              >
                {FEELING_LABEL[x]}
              </button>
            );
          })}
        </div>
      </div>
      <p className="muted">추천 이름 5개(한자 뜻·수리 4격·자원오행·발음오행 풀이)와 순한글 이름 후보를 함께 드립니다.</p>
    </fieldset>
  );
}
