import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// useEffect(() => 식) 꼴은 식의 값을 React가 '정리 함수'로 부른다.
// 새 크롬(155)은 scrollIntoView·scrollTo가 Promise를 돌려줘서 "i is not a function"으로 화면이 멈췄다.
// 그래서 효과 함수는 항상 { } 본문으로 쓴다.
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(n) ? [p] : [];
  });
}

describe("useEffect 본문", () => {
  it("화살표 함수가 값을 돌려주지 않는다", () => {
    const bad = files("src").filter((f) => /use(Layout)?Effect\(\(\)\s*=>\s*[^{\s]/.test(readFileSync(f, "utf8")));
    expect(bad).toEqual([]);
  });
});
