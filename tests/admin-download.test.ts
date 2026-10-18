import { afterEach, describe, expect, it, vi } from "vitest";
import { adminDownloadToken, checkAdminDownloadToken } from "@/lib/admin";

afterEach(() => vi.unstubAllEnvs());

describe("관리자 CSV 다운로드 표", () => {
  it("5분 안에만 쓸 수 있고 위조되지 않는다", () => {
    vi.stubEnv("ADMIN_PASSWORD", "correct-horse-1");
    const now = Date.now();
    const t = adminDownloadToken(now)!;
    expect(checkAdminDownloadToken(t, now + 60_000)).toBe(true);
    expect(checkAdminDownloadToken(t, now + 301_000)).toBe(false);
    expect(checkAdminDownloadToken(t.replace(/.$/, (c) => (c === "0" ? "1" : "0")), now)).toBe(false);
    expect(checkAdminDownloadToken("", now)).toBe(false);
    vi.stubEnv("ADMIN_PASSWORD", "another-pass-2");
    expect(checkAdminDownloadToken(t, now)).toBe(false);
  });
  it("관리 화면이 꺼져 있으면 표를 만들지 않는다", () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    expect(adminDownloadToken()).toBeNull();
  });
});
