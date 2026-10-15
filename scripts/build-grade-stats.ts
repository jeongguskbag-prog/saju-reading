// 1960~2009년에 태어날 수 있는 모든 사주의 등급 점수 분포를 계산해 src/lib/saju/grade-stats.json에 쓴다.
// 표본: 매일 × 12시진(각 시진 가운데 시각) × 남녀. 실행: npm run build:grade-stats
// CPU 코어 수만큼 자식 프로세스로 나눠 계산한 뒤 합친다.
import { fork } from "node:child_process";
import { writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { resolve } from "node:path";
import { calculateSaju } from "@/lib/saju/calc";
import { comboKey, gradeParts, type GradeStats } from "@/lib/saju/grade";

const FROM = 1960;
const TO = 2009;
// 진태양시 보정(약 -32분) 뒤 각 시진의 가운데에 오도록 시계 기준 홀수 시 30분을 쓴다.
const HOURS = Array.from({ length: 12 }, (_, i) => i * 2 + 1);
const NOW = new Date("2026-10-15T00:00:00Z");

function emptyStats(): GradeStats {
  return { range: `${FROM}-${TO}`, total: 0, histogram: new Array(1001).fill(0), combos: {}, nobles: { cheoneul: 0, munchang: 0 } };
}

function runShard(shard: number, shards: number): GradeStats {
  const st = emptyStats();
  const end = Date.UTC(TO, 11, 31);
  let i = 0;
  for (let t = Date.UTC(FROM, 0, 1); t <= end; t += 86_400_000, i++) {
    if (i % shards !== shard) continue;
    const d = new Date(t);
    for (const hour of HOURS) {
      for (const gender of ["male", "female"] as const) {
        const c = calculateSaju(
          { gender, calendar: "solar", year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour, minute: 30 },
          NOW,
          { skipMonthly: true },
        );
        const { parts, nobles } = gradeParts({
          pillars: c.pillars,
          counts: c.elements.counts,
          weighted: c.elements.weighted,
          strengthScore: c.strength.score,
          analysis: c.analysis,
        });
        const score = Math.round((parts.balance + parts.harmony + parts.yongsin + parts.daeun + parts.noble) * 10) / 10;
        st.histogram[Math.min(1000, Math.floor(score * 10 + 1e-9))]++;
        const key = comboKey(c.pillars.day, c.analysis.gyeokguk.name, c.analysis.usefulness.yongsin);
        st.combos[key] = (st.combos[key] ?? 0) + 1;
        if (nobles.cheoneul) st.nobles.cheoneul++;
        if (nobles.munchang) st.nobles.munchang++;
        st.total++;
      }
    }
  }
  return st;
}

function merge(all: GradeStats[]): GradeStats {
  const out = emptyStats();
  for (const s of all) {
    out.total += s.total;
    s.histogram.forEach((n, i) => (out.histogram[i] += n));
    for (const [k, n] of Object.entries(s.combos)) out.combos[k] = (out.combos[k] ?? 0) + n;
    out.nobles.cheoneul += s.nobles.cheoneul;
    out.nobles.munchang += s.nobles.munchang;
  }
  out.combos = Object.fromEntries(Object.entries(out.combos).sort(([a], [b]) => a.localeCompare(b)));
  return out;
}

const [shardArg, shardsArg] = process.argv.slice(2);
if (shardArg !== undefined) {
  process.send!(runShard(Number(shardArg), Number(shardsArg)));
  process.exit(0);
} else {
  const shards = Math.max(1, availableParallelism());
  const started = Date.now();
  const results = await Promise.all(
    Array.from(
      { length: shards },
      (_, k) =>
        new Promise<GradeStats>((ok, fail) => {
          const child = fork(process.argv[1], [String(k), String(shards)]);
          child.on("message", (m) => ok(m as GradeStats));
          child.on("error", fail);
          child.on("exit", (code) => code !== 0 && fail(new Error(`shard ${k} exited ${code}`)));
        }),
    ),
  );
  const st = merge(results);
  const out = resolve(process.cwd(), "src/lib/saju/grade-stats.json");
  writeFileSync(out, JSON.stringify(st) + "\n");
  console.log(`${st.total.toLocaleString()}개 사주, 조합 ${Object.keys(st.combos).length}종, ${((Date.now() - started) / 1000).toFixed(0)}초 → ${out}`);
}
