import { describe, expect, it } from "vitest";
import { canonicalRedirect } from "@/proxy";

describe("예전 주소 넘기기", () => {
  it("실제 사이트의 vercel.app 화면 요청은 대표 주소로", () => {
    expect(canonicalRedirect("saju-reading-azure.vercel.app", "/my", "?welcome=1", "production")).toBe("https://www.chungirok.com/my?welcome=1");
    expect(canonicalRedirect("saju-reading-azure.vercel.app", "/", "", "production")).toBe("https://www.chungirok.com/");
    expect(canonicalRedirect("saju-reading-azure.vercel.app", "/r/abc", "?render=x", "production")).toBe("https://www.chungirok.com/r/abc?render=x");
  });

  it("api, 대표 주소, 미리보기 배포, 개발은 그대로", () => {
    expect(canonicalRedirect("saju-reading-azure.vercel.app", "/api/deliver", "", "production")).toBeNull();
    expect(canonicalRedirect("saju-reading-azure.vercel.app", "/api/auth/kakao/callback", "?code=1", "production")).toBeNull();
    expect(canonicalRedirect("www.chungirok.com", "/my", "", "production")).toBeNull();
    expect(canonicalRedirect("saju-reading-git-x.vercel.app", "/", "", "preview")).toBeNull();
    expect(canonicalRedirect("localhost:3000", "/", "", undefined)).toBeNull();
  });
});
