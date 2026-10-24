import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (n: string) => (cookieJar.has(n) ? { value: cookieJar.get(n) } : undefined) }),
  headers: async () => new Headers(),
}));

import { checkOwnerApp, OWNER_APP_COOKIE, ownerAppCookieValue } from "@/lib/admin";
import { POST as register } from "@/app/api/owner-app/route";
import { POST as login } from "@/app/api/admin/login/route";
import { createMemoryStore, setStoreForTest } from "@/lib/store";

const KEY = "k".repeat(20);

beforeEach(() => {
  setStoreForTest(createMemoryStore());
  cookieJar.clear();
  vi.stubEnv("APP_ACCESS_KEY", KEY);
  vi.stubEnv("ADMIN_PASSWORD", "password123");
});
afterEach(() => vi.unstubAllEnvs());

describe("관리 화면은 관리자용 앱에서만", () => {
  it("앱 키를 보내야 관리자용 앱 쿠키를 준다", async () => {
    expect((await register(new Request("https://x.test/api/owner-app", { method: "POST" }))).status).toBe(403);
    expect((await register(new Request("https://x.test/api/owner-app", { method: "POST", headers: { "x-app-key": "wrong-key-wrong-key" } }))).status).toBe(403);
    const ok = await register(new Request("https://x.test/api/owner-app", { method: "POST", headers: { "x-app-key": KEY } }));
    expect(ok.status).toBe(204);
    const set = ok.headers.get("set-cookie") ?? "";
    expect(set).toContain(`${OWNER_APP_COOKIE}=${ownerAppCookieValue()}`);
    expect(set).toContain("HttpOnly");
    expect(checkOwnerApp(ownerAppCookieValue()!)).toBe(true);
    expect(checkOwnerApp("nope")).toBe(false);
  });

  it("웹 브라우저(쿠키 없음)에서는 비밀번호가 맞아도 로그인되지 않는다", async () => {
    const req = () => new Request("https://x.test/api/admin/login", { method: "POST", body: JSON.stringify({ password: "password123" }) });
    expect((await login(req())).status).toBe(404);
    cookieJar.set(OWNER_APP_COOKIE, ownerAppCookieValue()!);
    expect((await login(req())).status).toBe(200);
  });
});
