"use client";

import { useEffect, useState } from "react";
import type { BirthInput } from "@/lib/saju/calc";

/** 로그인 전에 저장하려던 사주. 카카오 로그인을 마치고 마이 화면에 오면 저장한다. */
export const PENDING_PROFILE_KEY = "saju-pending-profile";

type Me = { enabled: boolean; member: { nickname: string } | null };

/**
 * 결과 맨 위의 '마이에 저장' 띠. 회원 기능이 꺼져 있으면 아무것도 그리지 않는다.
 * 로그인하지 않았으면 카카오 로그인으로 보내고, 돌아오면 마이 화면이 이 사주를 저장한다.
 */
export default function MemberSaveBar({ input }: { input: BirthInput }) {
  const [me, setMe] = useState<Me | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | string>("idle");
  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe(null));
  }, []);
  useEffect(() => setState("idle"), [input]);
  if (!me?.enabled) return null;

  async function save() {
    setState("saving");
    const res = await fetch("/api/me/profiles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setState(res?.ok ? "saved" : (data?.error ?? "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요."));
  }

  function login() {
    try {
      window.localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify(input));
    } catch {
      // 저장소를 못 쓰면 로그인만 한다.
    }
    window.location.href = "/api/auth/kakao?next=/my";
  }

  return (
    <div className="member-save no-print">
      {me.member ? (
        state === "saved" ? (
          <p>
            ✓ 마이에 저장했습니다. <a href="/my">마이에서 보기</a>
          </p>
        ) : (
          <>
            <p>이 사주를 마이에 저장해 두면 다음부터 입력 없이 바로 보고, 매일 오늘의 운세도 받을 수 있습니다.</p>
            <button type="button" className="btn-secondary" onClick={save} disabled={state === "saving"}>
              {state === "saving" ? "저장 중…" : "마이에 저장"}
            </button>
          </>
        )
      ) : (
        <>
          <p>카카오로 로그인하면 이 사주를 저장하고 매일 오늘의 운세를 받을 수 있습니다. 가입하면 내 명식을 계산한 값으로 답하는 명리 AI 상담 무료 질문도 드립니다.</p>
          <button type="button" className="kakao-login" onClick={login}>
            카카오로 저장하기
          </button>
        </>
      )}
      {state !== "idle" && state !== "saving" && state !== "saved" && (
        <p className="error" role="alert">
          {state}
        </p>
      )}
    </div>
  );
}
