// 주문과 리포트를 담는 키-값 저장소(서버 전용).
// - 배포: Upstash Redis REST API. Vercel Marketplace의 Upstash(Redis) 연결 시 생기는
//   KV_REST_API_URL / KV_REST_API_TOKEN 또는 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN을 읽는다.
// - 개발(npm run dev): .cache/store 폴더의 JSON 파일
// - 테스트: 메모리
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface Store {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  /** 키가 없을 때만 저장. 저장했으면 true. */
  setIfAbsent(key: string, value: unknown, ttlSeconds?: number): Promise<boolean>;
  del(key: string): Promise<void>;
  /** 정수 카운터를 1 올리고 올린 값을 돌려준다. 처음 만들 때 ttlSeconds 뒤에 사라지게 한다. */
  incr(key: string, ttlSeconds: number): Promise<number>;
  /** 목록 맨 앞에 값을 넣는다(최근 것이 앞). */
  listPush(key: string, value: string): Promise<void>;
  /** 목록의 start~stop번째(0부터, stop 포함) 값 */
  listRange(key: string, start: number, stop: number): Promise<string[]>;
}

export class StoreError extends Error {}

function upstashEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

function upstashStore(env: { url: string; token: string }): Store {
  async function command(args: (string | number)[]): Promise<unknown> {
    const res = await fetch(env.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as { result?: unknown; error?: string };
    if (!res.ok || data.error) throw new StoreError(`저장소 오류: ${data.error ?? res.status}`);
    return data.result;
  }
  const setArgs = (key: string, value: unknown, ttl?: number) => ["SET", key, JSON.stringify(value), ...(ttl ? ["EX", ttl] : [])];
  return {
    async get<T>(key: string) {
      const raw = await command(["GET", key]);
      return typeof raw === "string" ? (JSON.parse(raw) as T) : null;
    },
    async set(key, value, ttl) {
      await command(setArgs(key, value, ttl));
    },
    async setIfAbsent(key, value, ttl) {
      return (await command([...setArgs(key, value, ttl), "NX"])) === "OK";
    },
    async del(key) {
      await command(["DEL", key]);
    },
    async incr(key, ttl) {
      const n = Number(await command(["INCR", key]));
      if (n === 1) await command(["EXPIRE", key, ttl]);
      return n;
    },
    async listPush(key, value) {
      await command(["LPUSH", key, value]);
    },
    async listRange(key, start, stop) {
      const r = await command(["LRANGE", key, start, stop]);
      return Array.isArray(r) ? r.map(String) : [];
    },
  };
}

type Entry = { value: unknown; expires: number | null };

function memoryStore(map = new Map<string, Entry>()): Store {
  const live = (key: string) => {
    const e = map.get(key);
    if (e && e.expires !== null && e.expires < Date.now()) map.delete(key);
    return map.get(key) ?? null;
  };
  return {
    async get<T>(key: string) {
      const e = live(key);
      return e ? (structuredClone(e.value) as T) : null;
    },
    async set(key, value, ttl) {
      map.set(key, { value: structuredClone(value), expires: ttl ? Date.now() + ttl * 1000 : null });
    },
    async setIfAbsent(key, value, ttl) {
      if (live(key)) return false;
      map.set(key, { value: structuredClone(value), expires: ttl ? Date.now() + ttl * 1000 : null });
      return true;
    },
    async del(key) {
      map.delete(key);
    },
    async incr(key, ttl) {
      const e = live(key);
      const n = (typeof e?.value === "number" ? e.value : 0) + 1;
      map.set(key, { value: n, expires: e?.expires ?? Date.now() + ttl * 1000 });
      return n;
    },
    async listPush(key, value) {
      const e = live(key);
      const list = Array.isArray(e?.value) ? (e.value as string[]) : [];
      map.set(key, { value: [value, ...list], expires: null });
    },
    async listRange(key, start, stop) {
      const e = live(key);
      const list = Array.isArray(e?.value) ? (e.value as string[]) : [];
      return list.slice(start, stop < 0 ? undefined : stop + 1);
    },
  };
}

/** 개발용: 프로세스를 다시 띄워도 남도록 파일에 쓴다. setIfAbsent만 원자적으로 처리한다. */
function fileStore(dir: string): Store {
  const path = (key: string) => join(dir, `${encodeURIComponent(key)}.json`);
  const read = async (key: string): Promise<Entry | null> => {
    try {
      const e = JSON.parse(await readFile(path(key), "utf8")) as Entry;
      return e.expires !== null && e.expires < Date.now() ? null : e;
    } catch {
      return null;
    }
  };
  const write = async (key: string, value: unknown, ttl?: number) => {
    await mkdir(dir, { recursive: true });
    await writeFile(path(key), JSON.stringify({ value, expires: ttl ? Date.now() + ttl * 1000 : null }));
  };
  return {
    async get<T>(key: string) {
      return ((await read(key))?.value as T) ?? null;
    },
    set: write,
    async setIfAbsent(key, value, ttl) {
      // 파일을 "없을 때만 만들기"(wx)로 써서, 동시에 두 곳이 불러도 한 곳만 성공하게 한다.
      await mkdir(dir, { recursive: true });
      const body = JSON.stringify({ value, expires: ttl ? Date.now() + ttl * 1000 : null });
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await writeFile(path(key), body, { flag: "wx" });
          return true;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
          if (await read(key)) return false;
          await rm(path(key), { force: true }); // 기한이 지난 값이면 지우고 한 번 더
        }
      }
      return false;
    },
    async del(key) {
      await rm(path(key), { force: true });
    },
    // 개발용이라 원자적이지 않다(동시 요청이 겹치면 한두 번 덜 셀 수 있다).
    async incr(key, ttl) {
      const e = await read(key);
      const n = (typeof e?.value === "number" ? e.value : 0) + 1;
      await mkdir(dir, { recursive: true });
      await writeFile(path(key), JSON.stringify({ value: n, expires: e?.expires ?? Date.now() + ttl * 1000 }));
      return n;
    },
    async listPush(key, value) {
      const e = await read(key);
      await write(key, [value, ...(Array.isArray(e?.value) ? (e.value as string[]) : [])]);
    },
    async listRange(key, start, stop) {
      const e = await read(key);
      const list = Array.isArray(e?.value) ? (e.value as string[]) : [];
      return list.slice(start, stop < 0 ? undefined : stop + 1);
    },
  };
}

let cached: Store | null | undefined;

/** 설정된 저장소. 배포 환경에서 Upstash가 없으면 null(결제를 열지 않는다). */
export function getStore(): Store | null {
  if (cached !== undefined) return cached;
  const env = upstashEnv();
  if (env) cached = upstashStore(env);
  else if (process.env.NODE_ENV === "test" || process.env.VITEST) cached = memoryStore();
  else if (process.env.NODE_ENV !== "production" || process.env.SAJU_FILE_STORE === "1") cached = fileStore(join(process.cwd(), ".cache", "store"));
  else cached = null;
  return cached;
}

export function requireStore(): Store {
  const s = getStore();
  if (!s) throw new StoreError("저장소가 설정되지 않았습니다.");
  return s;
}

/** 테스트에서 저장소를 갈아 끼운다. */
export function setStoreForTest(store: Store | null) {
  cached = store;
}

export const createMemoryStore = () => memoryStore();
