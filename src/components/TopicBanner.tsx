"use client";
import { useEffect, useState } from "react";
import { topicFrom, type TopicInfo } from "@/lib/topic";

/** ?topic=… 으로 들어온 분께 첫 화면 바로 아래에서 그 주제로 안내한다. 주제가 없으면 아무것도 그리지 않는다. */
export default function TopicBanner() {
  const [topic, setTopic] = useState<TopicInfo | null>(null);
  useEffect(() => {
    setTopic(topicFrom(new URLSearchParams(location.search).get("topic")));
  }, []);
  if (!topic) return null;
  return (
    <section className="topic-banner" aria-label="찾아오신 주제 안내">
      <div className="lp-inner narrow">
        <p className="topic-title">{topic.title}</p>
        <p className="topic-lead">{topic.lead}</p>
        <a className="lp-cta" href="#saju-form">
          내 생년월일시로 무료 확인부터
        </a>
        <p className="topic-note">무료 결과 아래 신청 칸에 이 주제의 감정서를 미리 골라 둡니다.</p>
      </div>
    </section>
  );
}
