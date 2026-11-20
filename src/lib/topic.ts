// 유튜브·블로그 등에서 주제를 붙여 들어올 때(?topic=money): 맨 위 안내와 신청 칸의 기본 감정서를 그 주제로 맞춘다.
import type { ProductId } from "./product";

export interface TopicInfo {
  product: ProductId;
  title: string;
  lead: string;
}

const T = (product: ProductId, title: string, lead: string): TopicInfo => ({ product, title, lead });

export const TOPICS: Record<string, TopicInfo> = {
  money: T("money", "재물운이 궁금해서 오셨군요", "내 사주의 돈 그릇과 돈이 들어오고 새는 길, 앞으로 3년 중 재물이 드는 해를 계산으로 짚어 드립니다."),
  love: T("love", "연애운·인연이 궁금해서 오셨군요", "배우자 자리와 배우자성, 도화로 보는 연애 성향과 인연이 드는 해·달을 짚어 드립니다."),
  career: T("career", "직업·커리어 흐름이 궁금해서 오셨군요", "격국·관성·인성으로 보는 일하는 방식과 잘 맞는 일, 일이 풀리는 때를 짚어 드립니다."),
  newyear: T("newyear", "새해 운세가 궁금해서 오셨군요", "다가오는 해의 간지가 내 명식과 대운에 들어오는 모습, 삼재 여부와 열두 달 흐름을 정리해 드립니다."),
  gunghap: T("gunghap", "두 사람의 궁합이 궁금해서 오셨군요", "두 분의 일간·배우자 자리·띠의 합과 충, 오행 보완과 대운 흐름을 나란히 놓고 봅니다."),
  daeun: T("full", "10년 대운이 궁금해서 오셨군요", "평생의 대운 흐름과 지금 대운의 의미, 가까운 두 해의 세운까지 종합 감정서로 정리해 드립니다."),
  glance: T("glance", "한 해 운세를 가볍게 보고 싶으시군요", "990원 한 장 운세로 한 해의 흐름과 좋은 달·살필 달을 한 장에 정리해 드립니다."),
};

/** 같은 뜻의 다른 이름 */
const ALIAS: Record<string, string> = {
  wealth: "money", 재물: "money", 재물운: "money",
  연애: "love", 연애운: "love", romance: "love",
  job: "career", 직업: "career", 커리어: "career",
  year: "newyear", 신년: "newyear", 신년운세: "newyear",
  궁합: "gunghap", match: "gunghap",
  대운: "daeun", life: "daeun", full: "daeun",
};

/** 주소의 topic 값(예: money, year2027)을 주제로 바꾼다. 모르는 값이면 null */
export function topicFrom(raw: string | null | undefined): TopicInfo | null {
  if (!raw) return null;
  let key = raw.trim().toLowerCase();
  if (/^(year|newyear|신년)\d{4}$/.test(key)) key = "newyear";
  key = ALIAS[key] ?? key;
  return TOPICS[key] ?? null;
}
