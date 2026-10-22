import assert from "node:assert/strict";
import { findSecret } from "../lib/secret";
import { search, type Doc } from "../lib/search";
import { guessTopic, guessAbout } from "../lib/topics";
import { parseDate, parseTime, nextTime, icsFor } from "../lib/dates";
import * as C from "../lib/crypto";
import { joinResults, cleanRepeats } from "../lib/speech";

let n = 0, fail = 0;
const t = async (name: string, fn: () => void | Promise<void>) => {
  n++;
  try { await fn(); console.log("  ✓", name); } catch (e) { fail++; console.log("  ✗", name, "\n    ", (e as Error).message); }
};

(async () => {
  console.log("Secrets are blocked");
  for (const s of ["My ATM PIN is 4821", "atm pin 4 8 2 1", "UPI PIN: 123456", "wifi password is sunshine", "Wi-Fi password: Home@2024", "gmail password hunter2x",
    "card 4111 1111 1111 1111", "4111111111111111", "Aadhaar 2345 6789 0123", "aadhaar number 234567890123", "ssn 123-45-6789", "PAN ABCDE1234F",
    "OTP is 482913", "cvv 123", "account number 001234567890", "SBI a/c 30012345678", "నా ఏటీఎం పిన్ 4821", "वाईफाई पासवर्ड है sunshine123", "पासवर्ड: sunshine123"])
    await t(`blocks: ${s}`, () => assert.ok(findSecret(s), s));
  console.log("Normal things are allowed");
  for (const s of ["Amma's BP tablet is Amlong 5, one in the morning", "Dr. Rao 98480 12345", "Call Ravi on +91 98480 12345", "PIN code 500032, Hyderabad",
    "Our address pin code is 500032", "Password is in the blue diary", "The ATM card is in Nanna's wallet", "Wifi password is with Dad", "Electricity bill 2450 rupees due 26th",
    "Insurance policy paper is in the cupboard, top shelf", "Nanna's birthday is 24 October", "Spinach dal recipe: 2 cups dal", "pink file has the documents",
    "Gas booking number 7718955555", "Car insurance renewal 15 Dec 2026, agent Suresh 9848012345", "బీరువా పై అరలో నీలం ఫైల్‌లో ఉన్నాయి", "The bank is SBI, Jubilee Hills branch"])
    await t(`allows: ${s}`, () => assert.equal(findSecret(s), null, s));

  console.log("Topics");
  const tp: [string, string][] = [["Amma's BP tablet is Amlong 5", "health"], ["Plumber Raju 98480 11111", "contacts"], ["Spare house keys are in the kitchen drawer", "where"],
    ["Nanna's birthday is 24 October", "dates"], ["Gas cylinder booking number", "home"], ["LIC policy agent is Suresh", "money"], ["School bus comes at 7:30", "kids"], ["Car service every 6 months", "vehicles"],
    ["అమ్మ షుగర్ మాత్ర రాత్రి", "health"], ["दाल बनाने के लिए नमक और मसाला", "recipes"]];
  for (const [s, want] of tp) await t(`topic ${want}: ${s}`, () => assert.equal(guessTopic(s), want));
  await t("about: Amma's tablet", () => assert.deepEqual(guessAbout("Amma's BP tablet is Amlong 5", ["Meghna", "Ravi"]), ["Amma"]));
  await t("about: Ravi's school", () => assert.ok(guessAbout("Ravi's school fees due", ["Meghna", "Ravi"]).includes("Ravi")));

  console.log("Asking");
  const docs: Doc[] = [
    { id: "1", text: "Amma's BP tablet is Amlong 5, one in the morning after food.", about: ["Amma"], topic: "health", updated: 1 },
    { id: "2", text: "Amma's sugar tablet is Glycomet 500, after lunch and dinner.", about: ["Amma"], topic: "health", updated: 1 },
    { id: "3", text: "Amma's doctor is Dr. Rao at Apollo, 98480 12345.", about: ["Amma"], topic: "contacts", updated: 1 },
    { id: "4", text: "Dad's insurance papers are in the cupboard, top shelf, in the blue file.", about: ["Nanna"], topic: "where", updated: 1 },
    { id: "5", text: "Nanna's birthday is 24 October.", about: ["Nanna"], topic: "dates", updated: 1 },
    { id: "6", text: "Wifi company is Airtel. The router is behind the TV.", about: [], topic: "home", updated: 1 },
    { id: "7", text: "Plumber Raju 98480 11111", about: [], topic: "contacts", updated: 1 },
    { id: "8", text: "అమ్మ కళ్ళద్దాలు టీవీ పక్కన డ్రాయర్‌లో ఉంటాయి", about: ["Amma"], topic: "where", updated: 1 },
  ];
  const top = (q: string) => search(q, docs, ["Meghna", "Ravi"])[0]?.id;
  await t("What is Amma's BP tablet?", () => assert.equal(top("What is Amma's BP tablet?"), "1"));
  await t("mom's blood pressure medicine", () => assert.equal(top("mom's blood pressure medicine"), "1"));
  await t("Amma sugar pill", () => assert.equal(top("Amma sugar pill"), "2"));
  await t("Who is mom's doctor", () => assert.equal(top("Who is mom's doctor?"), "3"));
  await t("Where are dad's insurance papers", () => assert.equal(top("Where are dad's insurance papers?"), "4"));
  await t("When is Nanna's birthday", () => assert.equal(top("When is Nanna's birthday?"), "5"));
  await t("father bday", () => assert.equal(top("father bday"), "5"));
  await t("internet provider?", () => assert.equal(top("which internet company"), "6"));
  await t("plumber number", () => assert.equal(top("plumber number"), "7"));
  await t("Telugu: అమ్మ కళ్ళద్దాలు ఎక్కడ", () => assert.equal(top("అమ్మ కళ్ళద్దాలు ఎక్కడ"), "8"));
  await t("not found: car insurance due", () => assert.equal(top("When is the car insurance due?"), undefined));
  await t("not found: name only (Amma?)", () => assert.equal(top("Amma"), undefined));
  await t("not found: random", () => assert.equal(top("What is the capital of France"), undefined));

  console.log("Asking in Telugu and Hindi");
  const tdocs: Doc[] = [
    { id: "t1", text: "అమ్మ నువ్వు రోజు టైం కి టాబ్లెట్ వేసుకోవాలి మండే టు ఫ్రైడే ఉదయం 8 గంటలకు", about: ["Amma"], topic: "health", updated: 1 },
    { id: "t2", text: "నాన్న పుట్టినరోజు అక్టోబర్ 24", about: ["Nanna"], topic: "dates", updated: 1 },
    { id: "t3", text: "ఇంటి తాళాలు వంటగది సొరుగులో ఉన్నాయి", about: [], topic: "where", updated: 1 },
    { id: "t4", text: "प्लंबर राजू का नंबर 98480 11111", about: [], topic: "contacts", updated: 1 },
    { id: "t5", text: "Amma's sugar tablet is Glycomet 500 after dinner", about: ["Amma"], topic: "health", updated: 1 },
  ];
  const tt = (q: string) => search(q, tdocs, ["Meghna"])[0]?.id;
  await t("అమ్మ టాబ్లెట్ ఎప్పుడు వేసుకోవాలి", () => assert.equal(tt("అమ్మ టాబ్లెట్ ఎప్పుడు వేసుకోవాలి"), "t1"));
  await t("mixed: amma tablet morning", () => assert.ok(["t1", "t5"].includes(tt("amma tablet") ?? "")));
  await t("నాన్న పుట్టినరోజు ఎప్పుడు", () => assert.equal(tt("నాన్న పుట్టినరోజు ఎప్పుడు"), "t2"));
  await t("తాళాలు ఎక్కడ ఉన్నాయి", () => assert.equal(tt("తాళాలు ఎక్కడ ఉన్నాయి"), "t3"));
  await t("प्लंबर का नंबर", () => assert.equal(tt("प्लंबर का नंबर क्या है"), "t4"));
  await t("sugar tablet", () => assert.equal(tt("what is amma sugar tablet"), "t5"));
  await t("Telugu reminder time found", () => assert.equal(parseTime("ఉదయం 8 గంటలకు టాబ్లెట్"), "08:00"));
  await t("రాత్రి 9 గంటలకు -> 21:00", () => assert.equal(parseTime("రాత్రి 9 గంటలకు మాత్ర"), "21:00"));
  await t("सुबह 7 बजे -> 07:00", () => assert.equal(parseTime("सुबह 7 बजे दवा"), "07:00"));
  await t("Telugu tablet topic", () => assert.equal(guessTopic("అమ్మ టాబ్లెట్ వేసుకోవాలి"), "health"));

  console.log("Dates");
  const now = new Date(2026, 9, 21, 10, 0);
  await t("24 October", () => assert.equal(parseDate("Nanna's birthday is 24 October", now), "2026-10-24"));
  await t("Jan 2nd (next year)", () => assert.equal(parseDate("anniversary Jan 2nd", now), "2027-01-02"));
  await t("15/12", () => assert.equal(parseDate("renewal 15/12", now), "2026-12-15"));
  await t("Telugu month", () => assert.equal(parseDate("24 అక్టోబర్", now), "2026-10-24"));
  await t("no date in a phone number", () => assert.equal(parseDate("Call 98480 12345", now), null));
  await t("8 am", () => assert.equal(parseTime("one at 8 am"), "08:00"));
  await t("8:30 pm", () => assert.equal(parseTime("at 8:30 pm"), "20:30"));
  await t("morning", () => assert.equal(parseTime("in the morning after food"), "08:00"));
  await t("రాత్రి", () => assert.equal(parseTime("రాత్రి ఒకటి"), "21:00"));
  await t("yearly next", () => assert.equal(nextTime({ repeat: "yearly", date: "1960-10-24" }, now)?.getDate(), 24));
  await t("daily later today", () => assert.equal(nextTime({ repeat: "daily", time: "20:00" }, now)?.getDate(), 21));
  await t("daily passed -> tomorrow", () => assert.equal(nextTime({ repeat: "daily", time: "08:00" }, now)?.getDate(), 22));
  await t("monthly", () => assert.equal(nextTime({ repeat: "monthly", date: "2026-01-26" }, now)?.getDate(), 26));
  await t("once passed", () => assert.equal(nextTime({ repeat: "once", date: "2026-01-01" }, now), null));
  await t("calendar file", () => assert.match(icsFor("Nanna's birthday", { repeat: "yearly", date: "2026-10-24" }, now), /RRULE:FREQ=YEARLY/));

  console.log("Voice (Android repeats)");
  await t("cumulative phrases become one", () => assert.equal(joinResults(["అమ్మ", "అమ్మ నువ్వు", "అమ్మ నువ్వు రోజు", "అమ్మ నువ్వు రోజు టైం కి టాబ్లెట్ వేసుకోవాలి"]), "అమ్మ నువ్వు రోజు టైం కి టాబ్లెట్ వేసుకోవాలి"));
  await t("two separate phrases join", () => assert.equal(joinResults(["Amma's BP tablet", "is Amlong 5"]), "Amma's BP tablet is Amlong 5"));
  await t("her real Android text is cleaned", () => assert.equal(
    joinResults(["అమ్మ నువ్వు రోజు టైం కి టాబ్లెట్ వేసుకోవాలి", "అమ్మ నువ్వు రోజు టైం కి టాబ్లెట్ వేసుకోవాలి మండే టు ఫ్రైడే", "ఓన్లీ మార్నింగ్ మాత్రమే వేసుకోవాలి", "ఓన్లీ మార్నింగ్ మాత్రమే వేసుకోవాలి 8:00 తీసుకోవాలి"]),
    "అమ్మ నువ్వు రోజు టైం కి టాబ్లెట్ వేసుకోవాలి మండే టు ఫ్రైడే ఓన్లీ మార్నింగ్ మాత్రమే వేసుకోవాలి 8:00 తీసుకోవాలి"));
  await t("phone repeats last phrase in new turn", () => assert.equal(joinResults(["Amma tablet at 8", "at 8"]), "Amma tablet at 8"));
  await t("phone repeats whole text in new turn", () => assert.equal(joinResults(["Amma BP tablet Amlong 5", "Amma BP tablet Amlong 5"]), "Amma BP tablet Amlong 5"));
  await t("same word twice in a row", () => assert.equal(cleanRepeats("Amma Amma tablet"), "Amma tablet"));
  await t("repeated phrase removed", () => assert.equal(cleanRepeats("take the tablet take the tablet at 8"), "take the tablet at 8"));
  await t("phone number kept", () => assert.equal(cleanRepeats("call 98480 12345"), "call 98480 12345"));
  console.log("Locking");
  await t("family key travels only to the approved phone", async () => {
    const fk = await C.newFamilyKey();
    const a = await C.newDeviceKeys(), b = await C.newDeviceKeys(), evil = await C.newDeviceKeys();
    const box = await C.sealJSON(fk, { text: "secret recipe" });
    const sealed = await C.sealKeyFor(fk, a.priv, b.pub);
    const fkB = await C.openKeyFrom(sealed, b.priv, a.pub);
    assert.equal((await C.openJSON<{ text: string }>(fkB, box)).text, "secret recipe");
    await assert.rejects(C.openKeyFrom(sealed, evil.priv, a.pub));
  });
  await t("recovery pictures unlock the family key", async () => {
    const fk = await C.newFamilyKey();
    const picks = [1, 5, 9, 12, 33, 40, 2, 63, 17, 8, 22, 51];
    const r1 = await C.recoveryKeys(picks);
    const box = await C.seal(r1.key, await C.rawKey(fk));
    const r2 = await C.recoveryKeys(picks);
    assert.equal(r1.lookup, r2.lookup);
    const fk2 = await C.keyFromRaw(await C.open(r2.key, box));
    assert.deepEqual(await C.rawKey(fk2), await C.rawKey(fk));
    const wrong = await C.recoveryKeys([...picks.slice(0, 11), 0]);
    assert.notEqual(wrong.lookup, r1.lookup);
    await assert.rejects(C.open(wrong.key, box));
  });

  console.log(`\n${n - fail}/${n} passed`);
  process.exit(fail ? 1 : 0);
})();
