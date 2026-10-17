// 관리 화면(주문 내역) 로그인과 주문 표(서버 전용). ADMIN_PASSWORD가 있어야 열린다.
import { createHash, timingSafeEqual } from "node:crypto";
import { REGION_LABEL } from "./admin-labels";
import { won } from "./product";
import type { Order } from "./orders";

export const ADMIN_COOKIE = "chungirok_admin";

export const isAdminEnabled = () => Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 8);

/** 쿠키에 넣는 값: 비밀번호를 그대로 두지 않고 해시로 */
export function adminSessionValue(): string | null {
  if (!isAdminEnabled()) return null;
  return createHash("sha256").update(`chungirok-admin:${process.env.ADMIN_PASSWORD}`).digest("hex");
}

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export const checkAdminPassword = (password: string) => isAdminEnabled() && same(password, process.env.ADMIN_PASSWORD!);
export const checkAdminSession = (cookie: string | undefined) => {
  const v = adminSessionValue();
  return Boolean(v && cookie && same(cookie, v));
};

const kst = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 9 * 3_600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
};

export const ORDER_COLUMNS = [
  "결제일시",
  "주문번호",
  "상태",
  "상품",
  "결제 금액",
  "결제 수단",
  "카드·간편결제",
  "할부",
  "승인번호",
  "성함",
  "성별",
  "양력·음력",
  "생년월일",
  "태어난 시각",
  "출생 지역",
  "진태양시 보정",
  "작명 신청",
  "이메일",
  "휴대폰",
  "받을 곳",
  "감정서 주소",
] as const;

export type OrderRow = Record<(typeof ORDER_COLUMNS)[number], string>;

/** 주문 하나를 관리 표 한 줄로 */
export function orderRow(o: Order, origin: string): OrderRow {
  const i = o.input;
  const p = (n: number) => String(n).padStart(2, "0");
  const n = o.naming;
  const pay = o.payment;
  return {
    결제일시: kst(o.paidAt),
    주문번호: o.id,
    상태: o.status === "paid" ? "결제 완료" : "결제 전",
    상품: o.orderName,
    "결제 금액": won(o.amount),
    "결제 수단": o.method ?? "",
    "카드·간편결제": [pay?.card?.company, pay?.card?.number, pay?.easyPay].filter(Boolean).join(" "),
    할부: pay?.card ? (pay.card.installmentPlanMonths ? `${pay.card.installmentPlanMonths}개월` : "일시불") : "",
    승인번호: pay?.card?.approveNo ?? "",
    성함: i.name ?? "",
    성별: i.gender === "male" ? "남" : "여",
    "양력·음력": i.calendar === "solar" ? "양력" : `음력${i.isLeapMonth ? "(윤달)" : ""}`,
    생년월일: `${i.year}-${p(i.month)}-${p(i.day)}`,
    "태어난 시각": i.hour === null || i.hour === undefined ? "모름" : `${p(i.hour)}:${p(i.minute ?? 0)}`,
    "출생 지역": REGION_LABEL[i.region ?? "KR"] ?? String(i.region ?? "KR"),
    "진태양시 보정": i.options?.solarTimeCorrection === false ? "안 함" : "함",
    "작명 신청": n
      ? [
          n.mode === "baby" ? "아기 이름" : "개명",
          `${n.surname}(${n.surnameHanja})`,
          n.generation ? `돌림자 ${n.generation.hanja}(${n.generation.reading})` : "",
          n.feelings.length ? `느낌 ${n.feelings.join("·")}` : "",
          n.currentName ? `지금 이름 ${n.currentName.hangul}` : "",
        ]
          .filter(Boolean)
          .join(" / ")
      : "",
    이메일: o.email ?? "",
    휴대폰: o.phone ?? "",
    "받을 곳": (o.notify ?? []).map((t) => ({ email: "이메일", kakao: "카카오톡", sms: "문자" })[t]).join("·"),
    "감정서 주소": o.token ? `${origin}/r/${o.token}` : "",
  };
}

/** 엑셀에서 한글이 깨지지 않게 BOM을 붙인 CSV */
export function ordersCsv(rows: OrderRow[]): string {
  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return "﻿" + [ORDER_COLUMNS.join(","), ...rows.map((r) => ORDER_COLUMNS.map((c) => cell(r[c])).join(","))].join("\r\n");
}
