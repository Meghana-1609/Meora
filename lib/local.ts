// Everything this phone keeps, in the browser's private storage (IndexedDB).
// Keys are stored as CryptoKey objects; the phone's private key can't be copied out.
const DB = "meora", STORE = "kv";
let dbp: Promise<IDBDatabase> | null = null;
function db() {
  return (dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => {
      const d = r.result;
      // Phones close idle connections (app in background, storage cleanup). Forget it so the next call reopens.
      d.onclose = () => { if (dbp) dbp = null; };
      d.onversionchange = () => { d.close(); dbp = null; };
      res(d);
    };
    r.onerror = () => { dbp = null; rej(r.error); };
    r.onblocked = () => { dbp = null; rej(new Error("Storage is busy")); };
  }));
}
function once<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then((d) => new Promise<T>((res, rej) => {
    const t = d.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => res(r.result);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error ?? new Error("Storage transaction aborted"));
  }));
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  try { return await once(mode, fn); }
  catch (e) {
    // "The database connection is closing" / InvalidStateError: reopen and try one more time.
    const name = (e as DOMException)?.name, msg = String((e as Error)?.message ?? "");
    if (name === "InvalidStateError" || /closing|closed/i.test(msg)) { dbp = null; return once(mode, fn); }
    throw e;
  }
}
export const get = <T,>(k: string) => tx<T | undefined>("readonly", (s) => s.get(k) as IDBRequest<T | undefined>);
export const set = (k: string, v: unknown) => tx("readwrite", (s) => s.put(v, k));
export const del = (k: string) => tx("readwrite", (s) => s.delete(k));
export async function delPrefix(prefix: string) {
  const keys = (await tx("readonly", (s) => s.getAllKeys())) as IDBValidKey[];
  for (const k of keys) if (String(k).startsWith(prefix)) await del(String(k));
}
export async function wipeAll() { await tx("readwrite", (s) => s.clear()); }
