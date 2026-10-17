"use client";

import { useEffect, useState, type ReactNode } from "react";
import { kakaoChatUrl } from "@/lib/product";

type Tab = "home" | "reports" | "fortune" | "consult" | "my";

const ICON: Record<Tab, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  reports: (
    <>
      <path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v5h5M8.5 12h7M8.5 16h7" />
    </>
  ),
  fortune: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a4.5 4.5 0 0 1 0 9 4.5 4.5 0 0 0 0 9" />
      <circle cx="12" cy="7.5" r="1" />
      <circle cx="12" cy="16.5" r="1" />
    </>
  ),
  consult: <path d="M4 5h16v11H9l-5 4z M8 9.5h8M8 12.5h5" />,
  my: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1-4 4.5-6 8-6s7 2 8 6" />
    </>
  ),
};

/**
 * 휴대폰 화면 맨 아래에 고정되는 메뉴(홈·감정서·운세·상담·마이). 한국어 사이트에서만 쓴다.
 * - 상담: AI 상담 채팅을 만들기 전까지는 카카오톡 상담으로, 채널이 없으면 첫 화면 상담 안내로 보낸다.
 * - 마이: 회원 기능을 만들기 전까지는 주문 조회.
 * 첫 화면에서는 보고 있는 구역(감정서·운세)에 맞춰 칸에 불이 들어온다.
 */
export default function BottomNav({ current }: { current?: Tab }) {
  const [active, setActive] = useState<Tab | undefined>(current);
  const kakao = kakaoChatUrl();

  useEffect(() => {
    if (current) return;
    const price = document.getElementById("price");
    const extras = document.getElementById("extras");
    if (!price) return;
    const onScroll = () => {
      const mid = window.innerHeight / 2;
      const inside = (el: HTMLElement | null) => {
        const r = el?.getBoundingClientRect();
        return Boolean(r && r.top < mid && r.bottom > mid);
      };
      setActive(inside(extras) ? "fortune" : inside(price) ? "reports" : "home");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [current]);

  const items: { tab: Tab; label: string; href: string; external?: boolean }[] = [
    { tab: "home", label: "홈", href: "/" },
    { tab: "reports", label: "감정서", href: "/#price" },
    { tab: "fortune", label: "운세", href: "/#extras" },
    // AI 상담 채팅이 생기기 전에는 사람이 답하는 상담이므로 'AI'를 붙이지 않는다.
    kakao ? { tab: "consult", label: "상담", href: kakao, external: true } : { tab: "consult", label: "상담", href: "/#help" },
    { tab: "my", label: "마이", href: "/order" },
  ];

  return (
    <nav className="bottom-nav no-print" aria-label="메뉴">
      {items.map((it) => (
        <a
          key={it.tab}
          href={it.href}
          aria-current={active === it.tab ? "page" : undefined}
          {...(it.external ? { target: "_blank", rel: "noopener" } : {})}
          onClick={(e) => {
            // 첫 화면에서 '홈'은 맨 위로 부드럽게 올린다.
            if (it.tab === "home" && location.pathname === "/") {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
            {ICON[it.tab]}
          </svg>
          <span>{it.label}</span>
        </a>
      ))}
    </nav>
  );
}
