import type { Metadata } from "next";
import SiteShell from "@/components/SiteShell";
import { BRAND, BUSINESS } from "@/lib/product";

export const metadata: Metadata = {
  title: `Chungirok Publisher — ${BRAND.name}`,
  description: "How Chungirok publishes its own short videos to its TikTok account.",
};

/** TikTok 앱 심사용 안내 (영문). 회사 계정에 회사가 만든 영상을 올리는 도구 설명. */
export default function TikTokInfo() {
  const email = BUSINESS.email || "help@chungirok.com";
  return (
    <SiteShell>
      <article className="card policy" lang="en">
        <h1>Chungirok Publisher</h1>
        <p>
          Chungirok (chungirok.com) is a Korean fortune-reading (Saju) web service. We produce short educational and
          entertainment videos about Saju basics, zodiac signs and personality traits. <b>Chungirok Publisher</b> is our
          internal tool that schedules and publishes these videos to <b>Chungirok&apos;s own TikTok account</b>.
        </p>

        <h2>How it works</h2>
        <ol>
          <li>Our team creates a short vertical video and its caption.</li>
          <li>The account owner signs in once with TikTok (Login Kit) and authorizes the app.</li>
          <li>At the scheduled time, the tool uploads the video and caption with the Content Posting API (Direct Post).</li>
          <li>The tool checks the post status and records the result for the team.</li>
        </ol>

        <h2>Scopes we use</h2>
        <ul>
          <li><code>user.info.basic</code> — to show which TikTok account is connected.</li>
          <li><code>video.publish</code> — to publish our own videos to that account.</li>
        </ul>

        <h2>Data</h2>
        <p>
          We only store the access token and open_id of the connected Chungirok account, encrypted as server secrets. We
          never access other users&apos; accounts, never collect viewer data, and never sell or share data. Disconnecting
          the app deletes the token.
        </p>

        <h2>Policies &amp; contact</h2>
        <p>
          <a href="/terms">Terms of Service</a> · <a href="/privacy">Privacy Policy</a> · Contact:{" "}
          <a href={`mailto:${email}`}>{email}</a>
        </p>
      </article>
    </SiteShell>
  );
}
