"use client";
import { ICHING_TOPICS, type IchingRequest, type IchingTopic } from "@/lib/extras/requests";

export interface IchingForm {
  topic: IchingTopic;
  question: string;
}
export const emptyIchingForm = (): IchingForm => ({ topic: "general", question: "" });

export function toIchingRequest(f: IchingForm): { ok: true; value: IchingRequest } | { ok: false; error: string } {
  const q = f.question.trim();
  if ([...q].length < 5) return { ok: false, error: "물으실 내용을 5자 이상 적어 주세요." };
  if ([...q].length > 200) return { ok: false, error: "물으실 내용은 200자까지 적을 수 있습니다." };
  return { ok: true, value: { topic: f.topic, question: q } };
}

export default function IchingFields({ value: f, onChange }: { value: IchingForm; onChange: (f: IchingForm) => void }) {
  const set = (patch: Partial<IchingForm>) => onChange({ ...f, ...patch });
  return (
    <div className="extra-fields">
      <p className="label">주역 점 신청</p>
      <div className="field">
        <span className="label">물음의 분야</span>
        <div className="chip-row" role="group" aria-label="물음의 분야">
          {(Object.keys(ICHING_TOPICS) as IchingTopic[]).map((t) => (
            <button key={t} type="button" className="chip" aria-pressed={f.topic === t} onClick={() => set({ topic: t })}>
              {f.topic === t ? "✓ " : ""}
              {ICHING_TOPICS[t]}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="ic-q">물으실 내용 (한 가지)</label>
        <textarea id="ic-q" rows={3} maxLength={200} value={f.question} onChange={(e) => set({ question: e.target.value })} placeholder="예: 올해 안에 이직을 준비하는 것이 좋을까요?" />
        <p className="muted">
          한 번에 한 가지만, 마음을 가라앉히고 구체적으로 적어 주세요. 결제가 끝나면 시초점의 확률로 여섯 효를 한 번 얻어 괘를 세우며, 같은 물음을 다시
          점치지 않는 것이 주역의 법도입니다({[...f.question.trim()].length}/200자).
        </p>
      </div>
    </div>
  );
}
