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
  };
}

/** 개발용: 프로세스를 다시 띄워도 남도록 파일에 쓴다. 동시성은 보장하지 않는다. */
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
      if (await read(key)) return false;
      await write(key, value, ttl);
      return true;
    },
    async del(key) {
      await rm(path(key), { force: true });
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
