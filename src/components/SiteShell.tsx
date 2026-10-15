import type { ReactNode } from "react";
import { BRAND } from "@/lib/product";

/** 결제·리포트 화면의 머리. 브랜드를 눌러 첫 화면으로 돌아간다. */
export default function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="site-bar no-print">
        <a href="/" className="site-bar-brand">
          {BRAND.name} <span>{BRAND.hanja}</span>
        </a>
      </header>
      <main className="container">{children}</main>
    </>
  );
}
