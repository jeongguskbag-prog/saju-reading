"use client";

import { useEffect, useState } from "react";
import SajuApp from "./SajuApp";

/**
 * Android 앱 전용 화면의 입력·결과. 결제 상자 없이, 앱이 접근 키를 줄 때만 AI 풀이를 켠다.
 * 일반 브라우저로 /app을 열면 키가 없어 명식·등급 계산까지만 보인다.
 */
export default function AppEntry({ serverAi }: { serverAi: boolean }) {
  const [hasKey, setHasKey] = useState(false);
  useEffect(() => {
    setHasKey(Boolean(window.AndroidBridge?.appKey?.()));
  }, []);
  return <SajuApp aiEnabled={serverAi && hasKey} />;
}
