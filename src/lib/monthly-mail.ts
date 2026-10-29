// 매월 1일 '이달의 운세' 메일(서버 전용). 수신에 동의한 회원에게만, 내 사주(마이의 '내 사주') 기준으로 보낸다.
// 광고성 정보로 볼 수 있어 제목에 (광고)를 달고, 메일마다 한 번에 수신을 거부할 수 있는 링크를 넣는다.
// 같은 달에 한 회원에게 두 번 보내지 않는다(monthly-sent:YYYY-MM:회원번호).
import { createHmac } from "node:crypto";
import { getMember, MONTHLY_SUBS, type Member } from "./member";
import { isMailEnabled } from "./mail";
import { BRAND, BUSINESS } from "./product";
import { calculateSaju } from "./saju/calc";
import { monthCalendar, monthFortune } from "./saju/monthly-fortune";
import { requireStore } from "./store";

const KST = 9 * 3_600_000;
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function secret(): string {
  return process.env.MEMBER_SESSION_SECRET || process.env.RENDER_SECRET || "local-monthly";
}

/** 수신 거부 링크 서명(로그인 없이 메일에서 바로 거부) */
export function unsubscribeSig(memberId: string): string {
  return createHmac("sha256", secret()).update(`monthly-unsub:${memberId}`).digest("base64url").slice(0, 24);
}

export function unsubscribeUrl(origin: string, memberId: string): string {
  return `${origin}/api/monthly/unsubscribe?m=${encodeURIComponent(memberId)}&s=${unsubscribeSig(memberId)}`;
}

/** 이번 달(한국 시간) YYYY-MM */
export const kstYm = (now = new Date()) => new Date(now.getTime() + KST).toISOString().slice(0, 7);

/** 한 회원의 이달의 운세 메일. 내 사주가 없거나 수신 동의가 없으면 null. */
export function monthlyMail(member: Member, origin: string, now = new Date()): { to: string; subject: string; html: string; text: string } | null {
  const self = member.profiles.find((p) => p.self);
  if (!self || !member.monthlyMail) return null;
  const k = new Date(now.getTime() + KST);
  const year = k.getUTCFullYear();
  const month = k.getUTCMonth() + 1;
  const chart = calculateSaju(self.input, now);
  const f = monthFortune(chart, year, month);
  const cal = monthCalendar(chart, year, month);
  const WD = ["일", "월", "화", "수", "목", "금", "토"];
  const good = cal.days.filter((d) => d.mark === "좋음").slice(0, 5);
  const care = cal.days.filter((d) => d.mark === "주의").slice(0, 3);
  const dayList = (ds: typeof good) => ds.map((d) => `${d.day}일(${WD[d.weekday]})`).join(", ");
  const name = self.input.name?.trim() || member.nickname || "회원";
  const my = `${origin}/my?cal=${year}-${String(month).padStart(2, "0")}#month-h`;
  const unsub = unsubscribeUrl(origin, member.id);
  const subject = `(광고) [${BRAND.name}] ${month}월의 운세 — ${f.title}`;
  const lines = [
    `${name} 님의 ${year}년 ${month}월 운세`,
    `${f.ganzhi}(${f.reading})월 · ${f.mark}`,
    "",
    f.title,
    f.text,
    f.tone,
    "",
    good.length ? `기운이 좋은 날: ${dayList(good)}` : "",
    care.length ? `살펴 갈 날: ${dayList(care)}` : "",
    "",
    `이사·계약 등 목적별 길일 달력 보기: ${my}`,
    "",
    `이 메일은 ${BRAND.name} 마이에서 '이달의 운세 메일 받기'에 동의하신 분께 보내 드립니다.`,
    `수신 거부: ${unsub}`,
    `${BUSINESS.companyName || BRAND.name} · ${BUSINESS.email}`,
  ].filter((l, i, a) => l !== "" || a[i - 1] !== "");
  const html = `<div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:560px;margin:0 auto;color:#2a2620;line-height:1.7">
<p style="font-size:13px;color:#b0262c;letter-spacing:.08em;margin:0 0 6px">${esc(BRAND.name)} · 이달의 운세</p>
<h1 style="font-size:20px;margin:0 0 4px">${esc(name)} 님의 ${year}년 ${month}월</h1>
<p style="font-size:13px;color:#7a7266;margin:0 0 16px">${esc(f.ganzhi)}(${esc(f.reading)})월 · 내 사주 기준</p>
<p style="font-size:17px;font-weight:700;margin:0 0 8px"><span style="border:1px solid currentColor;border-radius:999px;padding:1px 10px;font-size:13px;color:${f.mark === "좋음" ? "#2f7d4f" : f.mark === "주의" ? "#b0262c" : "#57544d"}">${f.mark}</span> ${esc(f.title)}</p>
<p style="margin:0 0 8px">${esc(f.text)}</p>
<p style="margin:0 0 16px">${esc(f.tone)}</p>
${good.length ? `<p style="margin:0 0 4px"><b>기운이 좋은 날</b> ${esc(dayList(good))}</p>` : ""}
${care.length ? `<p style="margin:0 0 16px"><b>살펴 갈 날</b> ${esc(dayList(care))}</p>` : ""}
<p style="margin:20px 0"><a href="${esc(my)}" style="display:inline-block;background:#b0262c;color:#fff;text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:700">이달의 길일 달력 보기</a></p>
<p style="font-size:12px;color:#9a978d;margin:24px 0 0">이 메일은 ${esc(BRAND.name)} 마이에서 &lsquo;이달의 운세 메일 받기&rsquo;에 동의하신 분께 보내 드립니다. 더 받지 않으시려면 <a href="${esc(unsub)}" style="color:#9a978d">수신 거부</a>를 눌러 주세요.<br>${esc(BUSINESS.companyName || BRAND.name)} · ${esc(BUSINESS.email)}</p>
</div>`;
  return { to: member.monthlyMail.email, subject, html, text: lines.join("\n") };
}

async function sendOne(mail: { to: string; subject: string; html: string; text: string }, unsub: string): Promise<boolean> {
  const res = await fetch(`${(process.env.RESEND_API_BASE || "https://api.resend.com").replace(/\/$/, "")}/emails`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [mail.to],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      headers: { "List-Unsubscribe": `<${unsub}>` },
    }),
  }).catch(() => null);
  return Boolean(res?.ok);
}

export interface MonthlyRun {
  ym: string;
  at: string;
  sent: number;
  skipped: number;
  failed: number;
  done: boolean;
}

export const MONTHLY_RUN_KEY = "monthly-run:last";

/** 이번 달 메일을 아직 안 받은 동의 회원에게 보낸다. 시간 안에 다 못 보내면 다음 호출이 이어서 보낸다. */
export async function sendMonthlyMails(origin: string, now = new Date(), deadlineMs = 720_000): Promise<MonthlyRun> {
  const store = requireStore();
  const ym = kstYm(now);
  const run: MonthlyRun = { ym, at: now.toISOString(), sent: 0, skipped: 0, failed: 0, done: true };
  if (!isMailEnabled()) {
    run.done = false;
    await store.set(MONTHLY_RUN_KEY, run, 60 * 60 * 24 * 60);
    return run;
  }
  const started = Date.now();
  const ids = [...new Set(await store.listRange(MONTHLY_SUBS, 0, 9999))];
  for (const id of ids) {
    if (Date.now() - started > deadlineMs) {
      run.done = false;
      break;
    }
    const member = await getMember(id).catch(() => null);
    const mail = member ? monthlyMail(member, origin, now) : null;
    if (!member || !mail) {
      run.skipped++;
      continue;
    }
    if (!(await store.setIfAbsent(`monthly-sent:${ym}:${id}`, now.toISOString(), 60 * 60 * 24 * 40))) {
      run.skipped++;
      continue;
    }
    // Resend 무료 요금제는 1초에 2통까지라 간격을 둔다.
    if (run.sent + run.failed > 0) await new Promise((r) => setTimeout(r, Number(process.env.MONTHLY_MAIL_GAP_MS ?? 600)));
    if (await sendOne(mail, unsubscribeUrl(origin, id))) run.sent++;
    else {
      run.failed++;
      await store.del(`monthly-sent:${ym}:${id}`);
    }
  }
  // 같은 달에 이어 보낸 경우(1일 9시·10시·11시 자동 실행, 지금 보내기) 보낸·실패 수를 합쳐 기록한다.
  const prev = await store.get<MonthlyRun>(MONTHLY_RUN_KEY);
  const total = prev?.ym === ym ? { ...run, sent: prev.sent + run.sent, failed: prev.failed + run.failed } : run;
  await store.set(MONTHLY_RUN_KEY, total, 60 * 60 * 24 * 60);
  return total;
}

/** 관리 화면: 수신 동의 회원 수와 마지막 발송 결과 */
export async function monthlyStatus(): Promise<{ subscribers: number; last: MonthlyRun | null }> {
  const store = requireStore();
  const ids = [...new Set(await store.listRange(MONTHLY_SUBS, 0, 9999))];
  let subscribers = 0;
  for (const id of ids) if ((await getMember(id).catch(() => null))?.monthlyMail) subscribers++;
  return { subscribers, last: await store.get<MonthlyRun>(MONTHLY_RUN_KEY) };
}
