"use client";

import { useEffect } from "react";
import { trackClient } from "@/lib/track-client";

/** 첫 화면 방문을 하루 한 번 센다(사장님 앱은 세지 않는다). */
export default function TrackVisit() {
  useEffect(() => {
    if (!window.AndroidBridge) trackClient("visit");
  }, []);
  return null;
}
