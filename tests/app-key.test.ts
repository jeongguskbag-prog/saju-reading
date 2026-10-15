import { afterEach, describe, expect, it } from "vitest";
import { isAppRequest } from "@/lib/reading";

const KEY = "app_key_for_tests_0123456789";

describe("앱 접근 키", () => {
  afterEach(() => {
    delete process.env.APP_ACCESS_KEY;
  });

  it("Vercel 키와 같을 때만 허용", () => {
    process.env.APP_ACCESS_KEY = KEY;
    expect(isAppRequest(KEY)).toBe(true);
    expect(isAppRequest(KEY + "x")).toBe(false);
    expect(isAppRequest("wrong")).toBe(false);
    expect(isAppRequest(null)).toBe(false);
    expect(isAppRequest("")).toBe(false);
  });

  it("서버 키가 없거나 16자 미만이면 항상 거부", () => {
    expect(isAppRequest(KEY)).toBe(false);
    process.env.APP_ACCESS_KEY = "short";
    expect(isAppRequest("short")).toBe(false);
  });
});
