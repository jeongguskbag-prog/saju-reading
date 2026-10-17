"use client";
import { TAEKIL_MAX_DAYS, TAEKIL_PURPOSES, checkTaekilRange, type TaekilPurpose, type TaekilRequest } from "@/lib/extras/requests";

export interface TaekilForm {
  purpose: TaekilPurpose;
  start: string;
  end: string;
  weekendsOnly: boolean;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);
/** 기본: 다음 주부터 두 달 */
export function emptyTaekilForm(): TaekilForm {
  const k = new Date(Date.now() + 9 * 3_600_000);
  const base = Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate());
  return { purpose: "move", start: ymd(new Date(base + 7 * 86_400_000)), end: ymd(new Date(base + 66 * 86_400_000)), weekendsOnly: false };
}

export function toTaekilRequest(f: TaekilForm): { ok: true; value: TaekilRequest } | { ok: false; error: string } {
  const problem = checkTaekilRange(f.start, f.end);
  if (problem) return { ok: false, error: problem };
  return { ok: true, value: { purpose: f.purpose, start: f.start, end: f.end, ...(f.weekendsOnly ? { weekendsOnly: true } : {}) } };
}

export default function TaekilFields({ value: f, onChange }: { value: TaekilForm; onChange: (f: TaekilForm) => void }) {
  const set = (patch: Partial<TaekilForm>) => onChange({ ...f, ...patch });
  return (
    <div className="extra-fields">
      <p className="label">택일 신청</p>
      <div className="field">
        <span className="label">어떤 일의 날을 잡을까요</span>
        <div className="chip-row" role="group" aria-label="택일 목적">
          {(Object.keys(TAEKIL_PURPOSES) as TaekilPurpose[]).map((p) => (
            <button key={p} type="button" className="chip" aria-pressed={f.purpose === p} onClick={() => set({ purpose: p })}>
              {f.purpose === p ? "✓ " : ""}
              {TAEKIL_PURPOSES[p]}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="label">날을 찾을 기간 (최대 {TAEKIL_MAX_DAYS}일)</span>
        <div className="row">
          <input type="date" aria-label="시작일" value={f.start} onChange={(e) => set({ start: e.target.value })} />
          <span aria-hidden>~</span>
          <input type="date" aria-label="끝나는 날" value={f.end} onChange={(e) => set({ end: e.target.value })} />
        </div>
        <label className="check" style={{ marginTop: 8 }}>
          <input type="checkbox" checked={f.weekendsOnly} onChange={(e) => set({ weekendsOnly: e.target.checked })} /> 토·일요일만 보기
        </label>
        <p className="muted">위에 적으신 의뢰인의 생년월일시로 봅니다. 결혼 택일이라면 두 분 중 한 분의 사주로 봅니다.</p>
      </div>
    </div>
  );
}
