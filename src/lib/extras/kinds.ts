// 사주 감정서 밖의 추가 상품(궁합·신년 운세·택일·주역 점·자미두수). 화면·서버 공용.
export const EXTRA_KINDS = ["gunghap", "newyear", "taekil", "iching", "ziwei", "love"] as const;
export type ExtraKind = (typeof EXTRA_KINDS)[number];

export const isExtraKind = (v: unknown): v is ExtraKind => typeof v === "string" && (EXTRA_KINDS as readonly string[]).includes(v);

/** 결과 저장 모양(파트 하나). computed는 엔진 계산값, text는 AI 문장. 상품마다 모양이 다르다. */
export interface ExtraResult<R = unknown, C = unknown, T = unknown> {
  kind: ExtraKind;
  request: R;
  computed: C;
  text: T;
}

/** 섹션형 문장(AI) */
export interface SectionsText {
  summary: string;
  sections: { heading: string; paragraphs: string[] }[];
  advice: string[];
}
