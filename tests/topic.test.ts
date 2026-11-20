import { describe, expect, it } from "vitest";
import { topicFrom } from "../src/lib/topic";
import { PRODUCTS } from "../src/lib/product";

describe("주제 링크(?topic=)", () => {
  it("영문·한글·연도 붙은 값을 알아듣는다", () => {
    expect(topicFrom("money")?.product).toBe("money");
    expect(topicFrom("wealth")?.product).toBe("money");
    expect(topicFrom("재물운")?.product).toBe("money");
    expect(topicFrom("year2027")?.product).toBe("newyear");
    expect(topicFrom("Love")?.product).toBe("love");
    expect(topicFrom("daeun")?.product).toBe("full");
  });
  it("모르는 값이나 빈 값은 무시한다", () => {
    expect(topicFrom("xyz")).toBeNull();
    expect(topicFrom("")).toBeNull();
    expect(topicFrom(null)).toBeNull();
  });
  it("가리키는 감정서는 모두 실제 상품이다", () => {
    for (const k of ["money", "love", "career", "newyear", "gunghap", "daeun", "glance"]) expect(PRODUCTS[topicFrom(k)!.product]).toBeTruthy();
  });
});
