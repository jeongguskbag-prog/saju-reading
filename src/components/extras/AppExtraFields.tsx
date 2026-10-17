"use client";

// 앱 화면(결제 없음)에서 고른 추가 상품의 신청서. 웹 결제 칸(PurchaseBox)과 같은 입력 부품을 쓴다.
import type { ExtraKind } from "@/lib/extras/kinds";
import { newyearChoices } from "@/lib/extras/requests";
import GunghapFields, { emptyGunghapForm, toGunghapRequest, type GunghapForm } from "./GunghapFields";
import IchingFields, { emptyIchingForm, toIchingRequest, type IchingForm } from "./IchingFields";
import TaekilFields, { emptyTaekilForm, toTaekilRequest, type TaekilForm } from "./TaekilFields";

export interface ExtraForms {
  gunghap: GunghapForm;
  taekil: TaekilForm;
  iching: IchingForm;
  newyearYear: number;
}

export function emptyExtraForms(gender: "male" | "female"): ExtraForms {
  const years = newyearChoices();
  return {
    gunghap: emptyGunghapForm(gender),
    taekil: emptyTaekilForm(),
    iching: emptyIchingForm(),
    // 10월부터는 내년을 먼저 고른다(웹과 같다).
    newyearYear: new Date().getMonth() >= 9 ? years[1] : years[0],
  };
}

const NEED_HOUR = "자미두수 명반은 태어난 시각이 있어야 세울 수 있습니다. 위에서 태어난 시각을 넣어 주세요.";

/** 신청서를 서버에 보낼 모양으로 바꾼다. 자미두수는 태어난 시각만 있으면 된다. */
export function toExtraRequest(
  kind: ExtraKind,
  f: ExtraForms,
  hourKnown: boolean,
): { ok: true; value: unknown } | { ok: false; error: string } {
  if (kind === "gunghap") return toGunghapRequest(f.gunghap);
  if (kind === "taekil") return toTaekilRequest(f.taekil);
  if (kind === "iching") return toIchingRequest(f.iching);
  if (kind === "newyear") return { ok: true, value: { year: f.newyearYear } };
  if (kind === "ziwei" && !hourKnown) return { ok: false, error: NEED_HOUR };
  return { ok: true, value: {} };
}

export default function AppExtraFields({
  kind,
  value: f,
  onChange,
  hourKnown,
}: {
  kind: ExtraKind;
  value: ExtraForms;
  onChange: (f: ExtraForms) => void;
  hourKnown: boolean;
}) {
  if (kind === "gunghap") return <GunghapFields value={f.gunghap} onChange={(gunghap) => onChange({ ...f, gunghap })} />;
  if (kind === "taekil") return <TaekilFields value={f.taekil} onChange={(taekil) => onChange({ ...f, taekil })} />;
  if (kind === "iching") return <IchingFields value={f.iching} onChange={(iching) => onChange({ ...f, iching })} />;
  if (kind === "newyear") {
    return (
      <div className="field">
        <span className="label">볼 해</span>
        <div className="segmented" role="group" aria-label="볼 해">
          {newyearChoices().map((y) => (
            <button key={y} type="button" aria-pressed={f.newyearYear === y} onClick={() => onChange({ ...f, newyearYear: y })}>
              {y}년
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (kind === "ziwei" && !hourKnown) {
    return (
      <p className="error" role="alert">
        {NEED_HOUR}
      </p>
    );
  }
  return null;
}
