"use client";

import { useEffect, useState } from "react";

/** 휴대폰에서 화면 아래에 늘 떠 있는 '무료로 확인하기' 버튼. 첫 화면이나 신청서가 보일 때는 숨긴다. */
export default function StickyCta() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const hero = document.querySelector(".lp-hero");
    const form = document.getElementById("saju-form");
    const seen = new Map<Element, boolean>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) seen.set(e.target, e.isIntersecting);
      setShow(![...seen.values()].some(Boolean));
    });
    if (hero) io.observe(hero);
    if (form) io.observe(form);
    return () => io.disconnect();
  }, []);
  return (
    <div className={`sticky-cta no-print${show ? " on" : ""}`} aria-hidden={!show}>
      <a href="#saju-form" tabIndex={show ? 0 : -1}>내 사주 유형 무료로 확인하기</a>
    </div>
  );
}
