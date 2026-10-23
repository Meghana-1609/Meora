// Two free storage backends: local files (on your computer) or Postgres on Neon (online).
// The server only ever stores locked (encrypted) notes. It cannot read them.
import { promises as fs } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import type { WireItem } from "../types";

export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }

interface Backend {
  get<T>(key: string): Promise<{ data: T; v: number } | null>;
  insert<T>(key: string, data: T): Promise<boolean>;            // false if it exists
  update<T>(key: string, data: T, v: number): Promise<boolean>; // optimistic lock
  remove(key: string): Promise<void>;
  list<T>(prefix: string): Promise<{ key: string; data: T; v: number }[]>;
  putItem(fam: string, item: WireItem): Promise<void>;
  getItem(fam: string, id: string): Promise<WireItem | null>;
  items(fam: string, since: number): Promise<WireItem[]>;
  putBlob(fam: string, id: string, data: string): Promise<void>;
  getBlob(fam: string, id: string): Promise<string | null>;
  wipe(fam: string): Promise<void>;
  // for the owner's admin page: counts only, never the locked contents
  families(): Promise<unknown[]>;
  itemMeta(): Promise<{ fam: string; kind: string; updated: number; deleted: boolean; by: string }[]>;
}

const DIR = path.join(process.cwd(), ".data");
const safe = (s: string) => s.replace(/[^A-Za-z0-9_.:-]/g, "_");
const g = globalThis as unknown as { __mLocks?: Map<string, Promise<unknown>> };
const locks = (g.__mLocks ??= new Map());
async function serial<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(fn);
  locks.set(key, next);
  try { return await next; } finally { if (locks.get(key) === next) locks.delete(key); }
}
async function readJson<T>(f: string): Promise<T | null> { try { return JSON.parse(await fs.readFile(f, "utf8")); } catch { return null; } }
async function writeJson(f: string, v: unknown) {
  await fs.mkdir(path.dirname(f), { recursive: true });
  const tmp = `${f}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(v)); await fs.rename(tmp, f);
}
const docFile = (k: string) => path.join(DIR, "docs", safe(k) + ".json");
const itemFile = (f: string) => path.join(DIR, "items", safe(f) + ".json");
const blobFile = (f: string, id: string) => path.join(DIR, "blobs", safe(f), safe(id));

const files: Backend = {
  get: (k) => readJson(docFile(k)),
  insert: (k, data) => serial("d" + k, async () => { if (await readJson(docFile(k))) return false; await writeJson(docFile(k), { data, v: 1, key: k }); return true; }),
  update: (k, data, v) => serial("d" + k, async () => { const c = await readJson<{ v: number }>(docFile(k)); if (!c || c.v !== v) return false; await writeJson(docFile(k), { data, v: v + 1, key: k }); return true; }),
  remove: async (k) => { await fs.rm(docFile(k), { force: true }); },
  list: async <T,>(prefix: string) => {
    const dir = path.join(DIR, "docs"), p = safe(prefix);
    const names = (await fs.readdir(dir).catch(() => [] as string[])).filter((n) => n.startsWith(p) && n.endsWith(".json"));
    const out: { key: string; data: T; v: number }[] = [];
    for (const n of names) { const r = await readJson<{ data: T; v: number; key?: string }>(path.join(dir, n)); if (r) out.push({ key: r.key ?? n.slice(0, -5), data: r.data, v: r.v }); }
    return out;
  },
  putItem: (fam, item) => serial("i" + fam, async () => {
    const all = (await readJson<Record<string, WireItem>>(itemFile(fam))) ?? {};
    all[item.id] = item; await writeJson(itemFile(fam), all);
  }),
  getItem: async (fam, id) => ((await readJson<Record<string, WireItem>>(itemFile(fam))) ?? {})[id] ?? null,
  items: async (fam, since) => Object.values((await readJson<Record<string, WireItem>>(itemFile(fam))) ?? {}).filter((i) => i.updated > since),
  putBlob: async (fam, id, data) => { await fs.mkdir(path.dirname(blobFile(fam, id)), { recursive: true }); await fs.writeFile(blobFile(fam, id), data); },
  getBlob: async (fam, id) => { try { return await fs.readFile(blobFile(fam, id), "utf8"); } catch { return null; } },
  wipe: async (fam) => { await fs.rm(itemFile(fam), { force: true }); await fs.rm(path.join(DIR, "blobs", safe(fam)), { recursive: true, force: true }); },
  families: async () => {
    const dir = path.join(DIR, "docs");
    const names = await fs.readdir(dir).catch(() => [] as string[]);
    const out: unknown[] = [];
    for (const n of names) if (n.startsWith("f:") || n.startsWith("f_")) { const r = await readJson<{ data: unknown }>(path.join(dir, n)); if (r) out.push(r.data); }
    return out;
  },
  itemMeta: async () => {
    const dir = path.join(DIR, "items");
    const names = await fs.readdir(dir).catch(() => [] as string[]);
    const out: { fam: string; kind: string; updated: number; deleted: boolean; by: string }[] = [];
    for (const n of names) {
      const all = (await readJson<Record<string, WireItem>>(path.join(dir, n))) ?? {};
      for (const i of Object.values(all)) out.push({ fam: n.replace(/\.json$/, ""), kind: i.kind, updated: i.updated, deleted: !!i.deleted, by: i.by });
    }
    return out;
  },
};

type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
export function pg(source: string | Sql): Backend {
  const sql = (typeof source === "string" ? neon(source) : source) as unknown as ReturnType<typeof neon>;
  let ready: Promise<unknown> | null = null;
  const init = () => (ready ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS mf_docs (key text PRIMARY KEY, data jsonb NOT NULL, v int NOT NULL DEFAULT 1)`;
    await sql`CREATE TABLE IF NOT EXISTS mf_items (fam text NOT NULL, id text NOT NULL, data jsonb NOT NULL, updated bigint NOT NULL, PRIMARY KEY (fam, id))`;
    await sql`CREATE INDEX IF NOT EXISTS mf_items_upd ON mf_items (fam, updated)`;
    await sql`CREATE TABLE IF NOT EXISTS mf_blobs (fam text NOT NULL, id text NOT NULL, data text NOT NULL, PRIMARY KEY (fam, id))`;
  })().catch((e) => { ready = null; throw e; }));
  return {
    async get(k) { await init(); const r = (await sql`SELECT data, v FROM mf_docs WHERE key = ${k}`) as { data: never; v: number }[]; return r[0] ?? null; },
    async insert(k, data) { await init(); const r = await sql`INSERT INTO mf_docs (key, data) VALUES (${k}, ${JSON.stringify(data)}::jsonb) ON CONFLICT DO NOTHING RETURNING key`; return (r as unknown[]).length > 0; },
    async update(k, data, v) { await init(); const r = await sql`UPDATE mf_docs SET data = ${JSON.stringify(data)}::jsonb, v = v + 1 WHERE key = ${k} AND v = ${v} RETURNING key`; return (r as unknown[]).length > 0; },
    async remove(k) { await init(); await sql`DELETE FROM mf_docs WHERE key = ${k}`; },
    async list(prefix) { await init(); const r = (await sql`SELECT key, data, v FROM mf_docs WHERE key LIKE ${prefix.replace(/[%_\\]/g, (c) => "\\" + c) + "%"}`) as { key: string; data: never; v: number }[]; return r; },
    async putItem(fam, item) { await init(); await sql`INSERT INTO mf_items (fam, id, data, updated) VALUES (${fam}, ${item.id}, ${JSON.stringify(item)}::jsonb, ${item.updated}) ON CONFLICT (fam, id) DO UPDATE SET data = EXCLUDED.data, updated = EXCLUDED.updated`; },
    async getItem(fam, id) { await init(); const r = (await sql`SELECT data FROM mf_items WHERE fam = ${fam} AND id = ${id}`) as { data: WireItem }[]; return r[0]?.data ?? null; },
    async items(fam, since) { await init(); const r = (await sql`SELECT data FROM mf_items WHERE fam = ${fam} AND updated > ${since}`) as { data: WireItem }[]; return r.map((x) => x.data); },
    async putBlob(fam, id, data) { await init(); await sql`INSERT INTO mf_blobs (fam, id, data) VALUES (${fam}, ${id}, ${data}) ON CONFLICT (fam, id) DO UPDATE SET data = EXCLUDED.data`; },
    async getBlob(fam, id) { await init(); const r = (await sql`SELECT data FROM mf_blobs WHERE fam = ${fam} AND id = ${id}`) as { data: string }[]; return r[0]?.data ?? null; },
    async wipe(fam) { await init(); await sql`DELETE FROM mf_items WHERE fam = ${fam}`; await sql`DELETE FROM mf_blobs WHERE fam = ${fam}`; },
    async families() { await init(); const r = (await sql`SELECT data FROM mf_docs WHERE key LIKE 'f:%'`) as { data: unknown }[]; return r.map((x) => x.data); },
    async itemMeta() {
      await init();
      const r = (await sql`SELECT fam, data->>'kind' AS kind, updated, coalesce((data->>'deleted')::boolean, false) AS deleted, data->>'by' AS by FROM mf_items`) as { fam: string; kind: string; updated: string | number; deleted: boolean; by: string }[];
      return r.map((x) => ({ ...x, updated: Number(x.updated) }));
    },
  };
}

export let db: Backend = process.env.DATABASE_URL ? pg(process.env.DATABASE_URL) : files;
/** Tests only: swap the storage. */
export function setBackend(b: Backend) { db = b; }

/** Read, change, save. Retries if two phones save at the same moment. */
export async function mutate<T>(key: string, change: (d: T) => T | void, missing = "Not found."): Promise<T> {
  for (let i = 0; i < 10; i++) {
    const row = await db.get<T>(key);
    if (!row) throw new HttpError(404, missing);
    const d = structuredClone(row.data);
    const out = (change(d) ?? d) as T;
    if (await db.update(key, out, row.v)) return out;
    await new Promise((r) => setTimeout(r, 15 + Math.random() * 60));
  }
  throw new HttpError(409, "Busy. Please try again.");
}
