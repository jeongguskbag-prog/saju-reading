// 휴대폰 번호 검사(화면·서버 공용). 010은 반드시 11자리(010-XXXX-XXXX), 옛 번호(011·016·017·018·019)는 10~11자리.
export const MOBILE_RE = /^(010\d{8}|01[16789]\d{7,8})$/;

/** 숫자만 남긴다(+82는 0으로). */
export const phoneDigits = (raw: string) => raw.replace(/[\s-]/g, "").replace(/^\+?82/, "0");

export const isMobile = (raw: string) => MOBILE_RE.test(phoneDigits(raw));
