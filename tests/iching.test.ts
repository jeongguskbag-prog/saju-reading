import { describe, expect, it } from "vitest";
import zhouyi from "../data/iching/zhouyi.json";
import { castHexagram, castLine, readHexagram, type LineValue } from "@/lib/extras/iching";

const req = { topic: "work" as const, question: "이직을 준비해도 될까요?" };

describe("주역 본문", () => {
  it("64괘, 괘마다 여섯 효, 효 이름이 괘상과 맞다", () => {
    expect(zhouyi).toHaveLength(64);
    const POS = ["初", "二", "三", "四", "五", "上"];
    for (const h of zhouyi) {
      expect(new Set(zhouyi.map((x) => x.bits)).size).toBe(64);
      h.lines.forEach((l, k) => {
        const v = h.bits[k] === "1" ? "九" : "六";
        expect(l.startsWith(k === 0 || k === 5 ? POS[k] + v : v + POS[k])).toBe(true);
      });
    }
    expect(zhouyi[13].lines[1]).toBe("九二：大車以載，有攸往，無咎。");
    expect(JSON.stringify(zhouyi)).not.toMatch(/[兇鹹]/);
  });
});

describe("시초점", () => {
  it("확률 1:5:7:3", () => {
    const counts = { 6: 0, 7: 0, 8: 0, 9: 0 } as Record<LineValue, number>;
    for (let r = 0; r < 16; r++) counts[castLine(r)]++;
    expect(counts).toEqual({ 6: 1, 7: 5, 8: 7, 9: 3 });
    expect(castHexagram()).toHaveLength(6);
  });
});

describe("변효 읽는 법", () => {
  it("움직이는 효 없음: 본괘 괘사", () => {
    const c = readHexagram([7, 7, 7, 7, 7, 7], req);
    expect(c.primary.name).toBe("乾");
    expect(c.primary.full).toBe("乾爲天");
    expect(c.changed).toBeNull();
    expect(c.focus[0].text).toBe("乾：元亨，利貞。");
  });
  it("한 효: 그 효사, 지괘", () => {
    const c = readHexagram([9, 7, 7, 7, 7, 7], req);
    expect(c.changed!.name).toBe("姤");
    expect(c.focus[0].text).toBe("初九：潛龍，勿用。");
  });
  it("두 효: 위의 효 먼저", () => {
    const c = readHexagram([9, 7, 7, 7, 9, 7], req);
    expect(c.focus.map((f) => f.text.slice(0, 2))).toEqual(["九五", "初九"]);
  });
  it("네 효: 지괘의 움직이지 않은 두 효, 아래 먼저", () => {
    const c = readHexagram([9, 9, 7, 9, 7, 9], req);
    expect(c.focus.map((f) => f.source)).toEqual([`지괘 ${c.changed!.name} 3효`, `지괘 ${c.changed!.name} 5효`]);
  });
  it("여섯 효 모두: 乾은 用九", () => {
    const c = readHexagram([9, 9, 9, 9, 9, 9], req);
    expect(c.changed!.name).toBe("坤");
    expect(c.focus[0].text).toBe("用九：見群龍無首，吉。");
  });
  it("水雷屯 괘 이름", () => {
    expect(readHexagram([7, 8, 8, 8, 7, 8], req).primary.full).toBe("水雷屯");
  });
});
