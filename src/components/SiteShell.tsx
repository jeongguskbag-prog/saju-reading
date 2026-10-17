import type { ReactNode } from "react";
import { BRAND } from "@/lib/product";
import BrandSeal from "./BrandSeal";
import SiteFooter from "./SiteFooter";
import LangSwitch from "./LangSwitch";
import OwnerLinks from "./OwnerLinks";
import { FloatingKakao } from "./SupportLinks";

/** 결제·리포트·안내 화면의 머리와 꼬리. 브랜드를 눌러 첫 화면으로 돌아간다. */
export default function SiteShell({ children, admin = false }: { children: ReactNode; /** 관리자 화면: 앱 화면·홈페이지 바로가기를 늘 보인다 */ admin?: boolean }) {
  return (
    <>
      <header className="site-bar no-print">
        <a href="/" className="site-bar-brand">
          <BrandSeal size={30} title="" />
          <span className="site-bar-name">{BRAND.name}</span>
          <span className="site-bar-sub">{BRAND.tagline}</span>
        </a>
        <LangSwitch tone="bar" />
      </header>
      {admin && <OwnerLinks mode="admin" />}
      <main className="container">{children}</main>
      <SiteFooter />
      <FloatingKakao />
    </>
  );
}
