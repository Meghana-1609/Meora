// All locking happens on the phone with the browser's built-in Web Crypto.
// Family key: AES-256-GCM. Each phone: an ECDH P-256 key pair whose private half never leaves it.
import type { Sealed } from "./types";

const subtle = () => globalThis.crypto.subtle;
const enc = new TextEncoder(), dec = new TextDecoder();
export const b64 = (u: ArrayBuffer | Uint8Array) => {
  const a = u instanceof Uint8Array ? u : new Uint8Array(u);
  let s = ""; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000));
  return btoa(s);
};
export const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const randomId = (n = 16) => b64(crypto.getRandomValues(new Uint8Array(n))).replace(/[+/=]/g, "").slice(0, n).padEnd(n, "x");

export const newFamilyKey = () => subtle().generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]) as Promise<CryptoKey>;
export const newNoteKey = newFamilyKey;
export async function newDeviceKeys() {
  const kp = (await subtle().generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveKey"])) as CryptoKeyPair;
  const pub = await subtle().exportKey("jwk", kp.publicKey);
  return { priv: kp.privateKey, pub: { kty: pub.kty, crv: pub.crv, x: pub.x, y: pub.y, ext: true } as JsonWebKey };
}
/** A key only these two phones can work out. */
export async function pairKey(myPriv: CryptoKey, theirPub: JsonWebKey) {
  const pub = await subtle().importKey("jwk", theirPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  return subtle().deriveKey({ name: "ECDH", public: pub }, myPriv, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function seal(key: CryptoKey, data: Uint8Array | string): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = typeof data === "string" ? enc.encode(data) : data;
  const ct = await subtle().encrypt({ name: "AES-GCM", iv }, key, bytes as BufferSource);
  return { iv: b64(iv), ct: b64(ct) };
}
export async function open(key: CryptoKey, s: Sealed): Promise<Uint8Array> {
  return new Uint8Array(await subtle().decrypt({ name: "AES-GCM", iv: unb64(s.iv) as BufferSource }, key, unb64(s.ct) as BufferSource));
}
export const sealJSON = (key: CryptoKey, v: unknown) => seal(key, JSON.stringify(v));
export const openJSON = async <T,>(key: CryptoKey, s: Sealed) => JSON.parse(dec.decode(await open(key, s))) as T;

export const rawKey = async (k: CryptoKey) => new Uint8Array(await subtle().exportKey("raw", k));
export const keyFromRaw = (raw: Uint8Array, extractable = true) =>
  subtle().importKey("raw", raw as BufferSource, { name: "AES-GCM" }, extractable, ["encrypt", "decrypt"]);

/** Lock the family key for a new phone (only that phone can unlock it). */
export async function sealKeyFor(familyKey: CryptoKey, myPriv: CryptoKey, theirPub: JsonWebKey) {
  return seal(await pairKey(myPriv, theirPub), await rawKey(familyKey));
}
export async function openKeyFrom(s: Sealed, myPriv: CryptoKey, theirPub: JsonWebKey, extractable = true) {
  return keyFromRaw(await open(await pairKey(myPriv, theirPub), s), extractable);
}

/** 12 recovery pictures -> a key (slow on purpose) and a lookup code for the server. */
export async function recoveryKeys(picks: number[]) {
  const phrase = "meora-recovery-v1|" + picks.join(",");
  const lookupBuf = await subtle().digest("SHA-256", enc.encode("lookup|" + phrase));
  const lookup = [...new Uint8Array(lookupBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const base = await subtle().importKey("raw", enc.encode(phrase), "PBKDF2", false, ["deriveKey"]);
  const key = await subtle().deriveKey({ name: "PBKDF2", salt: enc.encode("meora-salt-v1"), iterations: 310_000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  return { lookup, key };
}

export async function sha(s: string) {
  const b = await subtle().digest("SHA-256", enc.encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
