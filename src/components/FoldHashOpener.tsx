"use client";
import { useEffect } from "react";

/** 주소 끝 #아이디가 접힌 상자 안에 있으면 상자를 펼치고 그 자리로 내려간다(예전 링크 #contents·#method 등). */
export default function FoldHashOpener() {
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      if (!id) return;
      const el = document.getElementById(id);
      const fold = el?.closest("details");
      if (!el || !fold || fold.open) return;
      fold.open = true;
      requestAnimationFrame(() => el.scrollIntoView({ block: "start" }));
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);
  return null;
}
