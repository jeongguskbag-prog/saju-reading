"use client";
// 연분록(궁합) 신청: 상대 분의 성함·관계·생년월일시
import YearField from "../YearField";
import { GUNGHAP_RELATIONS, type GunghapRelation, type GunghapRequest } from "@/lib/extras/requests";

export interface GunghapForm {
  relation: GunghapRelation;
  name: string;
  gender: "male" | "female";
  calendar: "solar" | "lunar";
  isLeapMonth: boolean;
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  timeUnknown: boolean;
}

export const emptyGunghapForm = (myGender: "male" | "female"): GunghapForm => ({
  relation: "couple",
  name: "",
  gender: myGender === "male" ? "female" : "male",
  calendar: "solar",
  isLeapMonth: false,
  year: "",
  month: "1",
  day: "1",
  hour: "12",
  minute: "0",
  timeUnknown: false,
});

export function toGunghapRequest(f: GunghapForm): { ok: true; value: GunghapRequest } | { ok: false; error: string } {
  if (!f.name.trim()) return { ok: false, error: "상대 분의 성함을 적어 주세요." };
  if (!/^\d{4}$/.test(f.year) || Number(f.year) < 1900) return { ok: false, error: "상대 분의 태어난 해를 네 자리로 적어 주세요. (1900년 이후)" };
  const y = Number(f.year);
  const m = Number(f.month);
  const d = Number(f.day);
  if (f.calendar === "solar") {
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCMonth() !== m - 1) return { ok: false, error: "상대 분의 생년월일을 확인해 주세요." };
    if (dt.getTime() > Date.now()) return { ok: false, error: "상대 분의 생년월일이 미래입니다." };
  }
  return {
    ok: true,
    value: {
      relation: f.relation,
      partner: {
        name: f.name.trim(),
        gender: f.gender,
        calendar: f.calendar,
        ...(f.calendar === "lunar" ? { isLeapMonth: f.isLeapMonth } : {}),
        year: y,
        month: m,
        day: d,
        hour: f.timeUnknown ? null : Number(f.hour),
        minute: f.timeUnknown ? null : Number(f.minute),
      },
    },
  };
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

export default function GunghapFields({ value: f, onChange }: { value: GunghapForm; onChange: (f: GunghapForm) => void }) {
  const set = (patch: Partial<GunghapForm>) => onChange({ ...f, ...patch });
  return (
    <div className="extra-fields">
      <p className="label">궁합을 볼 상대 분</p>
      <div className="field">
        <span className="label">두 분의 관계</span>
        <div className="segmented" role="group" aria-label="두 분의 관계">
          {(Object.keys(GUNGHAP_RELATIONS) as GunghapRelation[]).map((r) => (
            <button key={r} type="button" aria-pressed={f.relation === r} onClick={() => set({ relation: r })}>
              {GUNGHAP_RELATIONS[r]}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="gh-name">상대 분 성함</label>
        <input id="gh-name" type="text" value={f.name} maxLength={40} onChange={(e) => set({ name: e.target.value })} placeholder="김하나" />
      </div>
      <div className="field">
        <span className="label">상대 분 성별</span>
        <div className="segmented" role="group" aria-label="상대 분 성별">
          <button type="button" aria-pressed={f.gender === "female"} onClick={() => set({ gender: "female" })}>여성</button>
          <button type="button" aria-pressed={f.gender === "male"} onClick={() => set({ gender: "male" })}>남성</button>
        </div>
      </div>
      <div className="field">
        <span className="label">상대 분 생년월일</span>
        <div className="segmented" role="group" aria-label="양력·음력" style={{ marginBottom: 8 }}>
          <button type="button" aria-pressed={f.calendar === "solar"} onClick={() => set({ calendar: "solar" })}>양력</button>
          <button type="button" aria-pressed={f.calendar === "lunar"} onClick={() => set({ calendar: "lunar" })}>음력</button>
        </div>
        <div className="row">
          <YearField value={f.year} onChange={(year) => set({ year })} />
          <select aria-label="상대 분 태어난 달" value={f.month} onChange={(e) => set({ month: e.target.value })}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}월</option>
            ))}
          </select>
          <select aria-label="상대 분 태어난 날" value={f.day} onChange={(e) => set({ day: e.target.value })}>
            {Array.from({ length: 31 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}일</option>
            ))}
          </select>
        </div>
        {f.calendar === "lunar" && (
          <label className="check" style={{ marginTop: 8 }}>
            <input type="checkbox" checked={f.isLeapMonth} onChange={(e) => set({ isLeapMonth: e.target.checked })} /> 윤달
          </label>
        )}
      </div>
      <div className="field">
        <span className="label">상대 분 태어난 시각</span>
        <div className="row">
          <select aria-label="상대 분 태어난 시" value={f.hour} disabled={f.timeUnknown} onChange={(e) => set({ hour: e.target.value })}>
            {HOURS.map((h) => (
              <option key={h} value={h}>{h}시</option>
            ))}
          </select>
          <select aria-label="상대 분 태어난 분" value={f.minute} disabled={f.timeUnknown} onChange={(e) => set({ minute: e.target.value })}>
            {MINUTES.map((m) => (
              <option key={m} value={m}>{m}분</option>
            ))}
          </select>
          <label className="check">
            <input type="checkbox" checked={f.timeUnknown} onChange={(e) => set({ timeUnknown: e.target.checked })} /> 모름
          </label>
        </div>
        <p className="muted">상대 분의 정보는 궁합 계산과 감정서 작성에만 쓰며, 상대 분께 미리 알리고 동의를 받아 주세요.</p>
      </div>
    </div>
  );
}
