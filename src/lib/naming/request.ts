// 작명록 신청서 검사와 화면에서 쓰는 목록(서버·브라우저 공용). 엔진(한자 자료)은 불러오지 않는다.
import { z } from "zod";
import type { NamingRequest } from "./engine";

export const FEELINGS = ["지혜", "밝음", "온화", "강건", "품격", "자연", "재복", "성취"] as const;
export type Feeling = (typeof FEELINGS)[number];

/** 화면에 보이는 느낌 이름 */
export const FEELING_LABEL: Record<Feeling, string> = {
  지혜: "지혜로운",
  밝음: "밝은",
  온화: "따뜻한",
  강건: "강인한",
  품격: "품격 있는",
  자연: "자연을 닮은",
  재복: "복이 많은",
  성취: "큰 뜻을 이루는",
};

/** 성씨와 흔히 쓰는 한자. 첫째가 가장 흔한 본. */
export const SURNAMES: { hangul: string; hanja: string[] }[] = [
  { hangul: "김", hanja: ["金"] }, { hangul: "이", hanja: ["李"] }, { hangul: "박", hanja: ["朴"] }, { hangul: "최", hanja: ["崔"] },
  { hangul: "정", hanja: ["鄭", "丁", "程"] }, { hangul: "강", hanja: ["姜", "康", "江"] }, { hangul: "조", hanja: ["趙", "曺"] },
  { hangul: "윤", hanja: ["尹"] }, { hangul: "장", hanja: ["張", "蔣", "章"] }, { hangul: "임", hanja: ["林", "任"] },
  { hangul: "한", hanja: ["韓"] }, { hangul: "오", hanja: ["吳"] }, { hangul: "서", hanja: ["徐"] }, { hangul: "신", hanja: ["申", "辛", "愼"] },
  { hangul: "권", hanja: ["權"] }, { hangul: "황", hanja: ["黃"] }, { hangul: "안", hanja: ["安"] }, { hangul: "송", hanja: ["宋"] },
  { hangul: "류", hanja: ["柳", "劉"] }, { hangul: "유", hanja: ["柳", "劉", "兪", "庾"] }, { hangul: "전", hanja: ["全", "田", "錢"] },
  { hangul: "홍", hanja: ["洪"] }, { hangul: "고", hanja: ["高"] }, { hangul: "문", hanja: ["文"] }, { hangul: "양", hanja: ["梁", "楊"] },
  { hangul: "손", hanja: ["孫"] }, { hangul: "배", hanja: ["裵"] }, { hangul: "백", hanja: ["白"] }, { hangul: "허", hanja: ["許"] },
  { hangul: "남", hanja: ["南"] }, { hangul: "심", hanja: ["沈"] }, { hangul: "노", hanja: ["盧", "魯"] }, { hangul: "하", hanja: ["河", "夏"] },
  { hangul: "곽", hanja: ["郭"] }, { hangul: "성", hanja: ["成"] }, { hangul: "차", hanja: ["車"] }, { hangul: "주", hanja: ["朱", "周"] },
  { hangul: "우", hanja: ["禹"] }, { hangul: "구", hanja: ["具", "丘"] }, { hangul: "민", hanja: ["閔"] }, { hangul: "진", hanja: ["陳", "秦"] },
  { hangul: "나", hanja: ["羅"] }, { hangul: "지", hanja: ["池"] }, { hangul: "엄", hanja: ["嚴"] }, { hangul: "채", hanja: ["蔡"] },
  { hangul: "원", hanja: ["元"] }, { hangul: "천", hanja: ["千"] }, { hangul: "방", hanja: ["方"] }, { hangul: "공", hanja: ["孔"] },
  { hangul: "현", hanja: ["玄"] }, { hangul: "함", hanja: ["咸"] }, { hangul: "변", hanja: ["卞", "邊"] }, { hangul: "염", hanja: ["廉"] },
  { hangul: "여", hanja: ["呂"] }, { hangul: "추", hanja: ["秋"] }, { hangul: "도", hanja: ["都"] }, { hangul: "소", hanja: ["蘇"] },
  { hangul: "석", hanja: ["石"] }, { hangul: "선", hanja: ["宣"] }, { hangul: "설", hanja: ["薛"] }, { hangul: "마", hanja: ["馬"] },
  { hangul: "길", hanja: ["吉"] }, { hangul: "연", hanja: ["延"] }, { hangul: "위", hanja: ["魏"] }, { hangul: "표", hanja: ["表"] },
  { hangul: "명", hanja: ["明"] }, { hangul: "기", hanja: ["奇"] }, { hangul: "반", hanja: ["潘"] }, { hangul: "왕", hanja: ["王"] },
  { hangul: "금", hanja: ["琴"] }, { hangul: "옥", hanja: ["玉"] }, { hangul: "육", hanja: ["陸"] }, { hangul: "인", hanja: ["印"] },
  { hangul: "맹", hanja: ["孟"] }, { hangul: "제", hanja: ["諸"] }, { hangul: "모", hanja: ["牟"] }, { hangul: "탁", hanja: ["卓"] },
  { hangul: "국", hanja: ["鞠"] }, { hangul: "어", hanja: ["魚"] }, { hangul: "은", hanja: ["殷"] }, { hangul: "편", hanja: ["片"] },
  { hangul: "용", hanja: ["龍"] }, { hangul: "예", hanja: ["芮"] }, { hangul: "경", hanja: ["慶"] }, { hangul: "봉", hanja: ["奉"] },
  { hangul: "사", hanja: ["史"] }, { hangul: "부", hanja: ["夫"] }, { hangul: "황보", hanja: ["皇甫"] }, { hangul: "남궁", hanja: ["南宮"] },
  { hangul: "제갈", hanja: ["諸葛"] }, { hangul: "선우", hanja: ["鮮于"] }, { hangul: "독고", hanja: ["獨孤"] }, { hangul: "사공", hanja: ["司空"] },
];

const hangul = (min: number, max: number) => z.string().regex(new RegExp(`^[가-힣]{${min},${max}}$`));
const hanja = (min: number, max: number) => z.string().regex(new RegExp(`^[\\u3400-\\u9FFF\\uF900-\\uFAFF]{${min},${max}}$`));

export const namingRequestSchema = z
  .object({
    mode: z.enum(["baby", "rename"]),
    surname: hangul(1, 2),
    surnameHanja: hanja(1, 2),
    generation: z
      .object({ hanja: hanja(1, 1), reading: hangul(1, 1), position: z.enum(["first", "second"]) })
      .nullable()
      .optional(),
    feelings: z.array(z.enum(FEELINGS)).max(3),
    currentName: z
      .object({ hangul: hangul(1, 3), hanja: hanja(1, 3).optional() })
      .nullable()
      .optional(),
  })
  .refine((r) => [...r.surname].length === [...r.surnameHanja].length, { message: "성씨 한글과 한자의 글자 수가 다릅니다." })
  .refine((r) => r.mode === "baby" || Boolean(r.currentName?.hangul), { message: "개명은 지금 이름을 적어 주세요." })
  .refine((r) => !r.currentName?.hanja || [...r.currentName.hanja].length === [...r.currentName.hangul].length, {
    message: "지금 이름의 한글과 한자 글자 수가 다릅니다.",
  });

export function parseNamingRequest(body: unknown): { ok: true; value: NamingRequest } | { ok: false; error: string } {
  const r = namingRequestSchema.safeParse(body);
  if (!r.success) {
    const msg = r.error.issues[0]?.message ?? "";
    return { ok: false, error: /[가-힣]/.test(msg) ? msg : "작명 신청 내용을 확인해 주세요." };
  }
  return { ok: true, value: r.data as NamingRequest };
}
