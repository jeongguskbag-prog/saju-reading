import type { ReactNode } from "react";
import { POLICY_EFFECTIVE_DATE } from "@/lib/product";
import SiteShell from "./SiteShell";

/** 약관·방침 공통 틀. */
export default function PolicyPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SiteShell>
      <article className="card policy">
        <h1>{title}</h1>
        <p className="muted">시행일 {POLICY_EFFECTIVE_DATE}</p>
        {children}
      </article>
    </SiteShell>
  );
}
