// Runs every server action against a real Postgres (PGlite) using the same SQL the live site uses on Neon.
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { pg, setBackend } from "../lib/server/store";
import * as F from "../lib/server/family";
import { record, lastDays } from "../lib/server/events";
import * as C from "../lib/crypto";

(async () => {
  const lite = new PGlite();
  const sql = (strings: TemplateStringsArray, ...vals: unknown[]) => lite.sql(strings, ...vals).then((r) => r.rows);
  setBackend(pg(sql));
  const req = (fam: string, member: string, token: string) => new Request("http://x", { headers: { "x-fam": fam, "x-member": member, "x-token": token } });
  const a = await C.newDeviceKeys(), b = await C.newDeviceKeys();
  const tokA = C.randomId(32), tokB = C.randomId(32);

  const made = await F.createFamily({ name: "Meghna", pub: a.pub, token: tokA });
  const A = req(made.fam, made.member, tokA);
  const inv = await F.invite(A);
  assert.equal(inv.code.length, 3);
  const again = await F.invite(A); assert.deepEqual(again.code, inv.code, "same invite reused");
  const j = await F.join({ code: inv.code, name: "Ravi", pub: b.pub, token: tokB });
  assert.equal(j.fam, made.fam);
  assert.equal((await F.joinStatus({ fam: j.fam, req: j.req, token: tokB })).status, "waiting");
  await assert.rejects(F.join({ code: [15, 14, 13].filter((x) => !inv.code.includes(x)).slice(0, 3).concat([0]).slice(0, 3), name: "X", pub: b.pub, token: tokB }));
  const fk = await C.newFamilyKey();
  const sealed = await C.sealKeyFor(fk, a.priv, b.pub);
  await F.decide(A, { req: j.req, allow: true, sealed });
  const st = await F.joinStatus({ fam: j.fam, req: j.req, token: tokB });
  assert.equal(st.status, "allowed");
  const B = req(made.fam, (st as { member: string }).member, tokB);

  const box = await C.sealJSON(fk, { kind: "note", text: "hi" });
  await F.putItems(A, [{ id: "note00000001", kind: "note", by: "", updated: 0, vis: null, box }]);
  await F.putItems(A, [{ id: "note00000002", kind: "note", by: "", updated: 0, vis: [made.member], keys: { [made.member]: box }, box }]);
  const sB = await F.sync(B, 0);
  assert.equal(sB.items.length, 1, "B sees only the shared note");
  const sA = await F.sync(A, 0);
  assert.equal(sA.items.length, 2);
  await F.putItems(B, [{ id: "note00000001", kind: "note", by: "", updated: 0, deleted: true }]);
  assert.ok((await F.sync(A, 0)).items.find((i) => i.id === "note00000001")?.deleted);
  await assert.rejects(F.putItems(B, [{ id: "note00000002", kind: "note", by: "", updated: 0, vis: null, box }]), /private/);

  await F.putBlob(A, { id: "blob00000001", data: "abc" });
  assert.equal((await F.getBlob(B, "blob00000001")).data, "abc");

  const lookup = "a".repeat(64);
  await F.setRecovery(A, { lookup, box });
  const rec = await F.useRecovery({ lookup, name: "New phone", pub: b.pub, token: C.randomId(32) });
  assert.equal(rec.fam, made.fam);

  await F.memberAction(A, { action: "remove", id: (st as { member: string }).member });
  await assert.rejects(F.sync(B, 0), /no longer/);

  await record({ d: "device0001", e: { open: 2, ask: 1, ask_found: 1, "lang:te": 1, "bad name!": 3 }, err: ["boom"] });
  await record({ d: "device0002", e: { open: 1 } });
  const today = (await lastDays(1))[0];
  assert.equal(today.counts.open, 3); assert.equal(today.counts["bad name!"], undefined);
  assert.equal(today.devices, 2); assert.equal(today.errors.length, 1);
  console.log("activity counts ok");

  await F.memberAction(A, { action: "delete-family" });
  await assert.rejects(F.sync(A, 0));
  console.log("ALL POSTGRES CHECKS PASSED");
})().catch((e) => { console.error("FAIL", e); process.exit(1); });
