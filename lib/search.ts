// Asking, without AI: finds the family note that best answers a question.
// Runs entirely on the phone, works offline, unlimited, free.
import type { TopicId } from "./types";

export type Doc = { id: string; text: string; about: string[]; topic: TopicId; updated: number };
export type Hit = { id: string; score: number; snippet: string };

const SYN: string[][] = [
  ["tablet", "medicine", "pill", "meds", "medication", "capsule", "goli", "dawa", "dawai", "టాబ్లెట్", "టాబ్లెట్లు", "టేబ్లెట్", "మెడిసిన్", "టాబ్లెట్స్", "टैबलेट", "टेबलेट", "मेडिसिन", "டேப்லெட்", "మాత్ర", "మందు", "మాత్రలు", "మందులు", "दवा", "दवाई", "गोली", "மாத்திரை", "மருந்து", "medicina", "pastilla", "médicament", "دواء", "药"],
  ["doctor", "dr", "physician", "డాక్టర్", "వైద్యుడు", "डॉक्टर", "டாக்டர்", "médico", "médecin", "طبيب", "医生"],
  ["birthday", "bday", "born", "బర్త్‌డే", "బర్త్డే", "बर्थडे", "పుట్టినరోజు", "జన్మదినం", "जन्मदिन", "பிறந்தநாள்", "cumpleaños", "anniversaire", "生日"],
  ["number", "phone", "mobile", "contact", "call", "cell", "నెంబర్", "నంబరు", "మొబైల్", "मोबाइल", "నంబర్", "ఫోన్", "नंबर", "फ़ोन", "फोन", "எண்", "teléfono", "téléphone", "هاتف", "电话"],
  ["wifi", "internet", "broadband", "net", "router"],
  ["mom", "amma", "mother", "mummy", "mum", "maa", "mama", "అమ్మ", "माँ", "मां", "अम्मा", "அம்மா"],
  ["dad", "nanna", "father", "papa", "daddy", "baba", "నాన్న", "पापा", "पिताजी", "அப்பா"],
  ["grandma", "ammamma", "nannamma", "nani", "dadi", "granny", "grandmother", "paati", "అమ్మమ్మ", "నాన్నమ్మ", "नानी", "दादी", "பாட்டி"],
  ["grandpa", "thatha", "tatayya", "nana", "dada", "grandfather", "తాత", "తాతయ్య", "नाना", "दादा", "தாத்தா"],
  ["key", "keys", "chabi", "chaabi", "తాళం", "తాళాలు", "కీ", "కీస్", "తాళంచెవి", "चाबी", "சாவி", "llave", "clé"],
  ["insurance", "policy", "lic", "బీమా", "ఇన్సూరెన్స్", "बीमा", "पॉलिसी", "காப்பீடு", "seguro", "assurance"],
  ["bp", "pressure", "hypertension", "బీపీ", "బిపి", "प्रेशर", "बीपी", "ప్రెషర్"],
  ["sugar", "diabetes", "diabetic", "షుగర్", "చక్కెర", "శుగర్", "शुगर", "मधुमेह"],
  ["cupboard", "almirah", "wardrobe", "beeruva", "బీరువా", "అల్మారా", "अलमारी", "அலமாரி"],
  ["papers", "documents", "document", "file", "certificate", "కాగితాలు", "పేపర్లు", "కాగితం", "कागज़", "कागज", "दस्तावेज़"],
  ["bill", "payment", "due", "బిల్లు", "बिल"],
  ["electricity", "current", "power", "కరెంట్", "बिजली"],
  ["gas", "cylinder", "lpg", "గ్యాస్", "गैस"],
  ["anniversary", "wedding", "పెళ్లిరోజు", "सालगिरह"],
  ["allergy", "allergic", "అలర్జీ", "एलर्जी"],
  ["plumber", "pipe", "leak"],
  ["electrician", "wiring"],
  ["recipe", "make", "cook", "prepare", "వంట", "रेसिपी", "बनाना"],
  ["school", "class", "teacher", "స్కూల్", "బడి", "स्कूल"],
  ["car", "vehicle", "కారు", "कार", "गाड़ी"],
  ["bike", "scooter", "two-wheeler", "బైక్", "बाइक"],
];
const SYN_MAP = new Map<string, number>();
SYN.forEach((g, i) => g.forEach((w) => SYN_MAP.set(w, i)));

const STOP = new Set(("a an the is are was were be been am of to for in on at by with and or but my our your his her their its this that these those it i we you he she they me us them " +
  "what whats what's which who whom whose how do does did can could should would will shall please tell me know about any there here from as " +
  "ఏమిటి ఏంటి ఏది ఎవరు ఎలా ఉంది ఉన్నాయి గారి యొక్క చెప్పు నాకు మన మా ఏ అది ఇది నువ్వు నేను కదా " +
  "क्या है हैं का की के को में से पर था थी कौन कैसे बताओ मुझे हमारा हमारी " +
  "என்ன யார் எப்படி உள்ளது " +
  "qué que cuál es el la los las de del en mi su quoi est le les des du mon ma " +
  "ما هو هي في من 的 是 什么 在 哪里").split(/\s+/));

// question words that hint which topic the answer is in
const INTENT: [RegExp, TopicId][] = [
  [/\b(where|kept)\b|ఎక్కడ|कहाँ|कहां|எங்கே|dónde|où|أين|哪里/i, "where"],
  [/\b(when|date|day)\b|ఎప్పుడు|कब|எப்போது|cuándo|quand|متى|什么时候/i, "dates"],
  [/\b(number|phone|call|contact)\b|నంబర్|नंबर|எண்/i, "contacts"],
  [/\b(tablet|medicine|pill|dose|doctor)\b|మాత్ర|మందు|दवा|गोली/i, "health"],
  [/\b(recipe|how to make|how to cook)\b/i, "recipes"],
];

const strip = (s: string) => s.normalize("NFC").replace(/[\u200b-\u200d\ufeff]/g, "").toLowerCase().replace(/[’']s\b/g, "").replace(/[’']/g, "");
const stem = (w: string) => {
  if (!/^[a-z]+$/.test(w) || w.length < 5) return w;
  return w.replace(/(ies)$/, "y").replace(/(ing|ed|es)$/, "").replace(/s$/, "");
};
export function tokens(s: string): string[] {
  const out: string[] = [];
  for (const raw of strip(s).split(/[^\p{L}\p{M}\p{N}+]+/u)) {
    if (!raw) continue;
    if (/\p{Script=Han}/u.test(raw)) { const ch = [...raw]; for (let i = 0; i < ch.length; i++) out.push(ch[i] + (ch[i + 1] ?? "")); continue; }
    // Telugu/Hindi suffixes: అమ్మకి -> అమ్మ, नानी की -> नानी
    let w = raw.replace(/(గారి|గారు|కి|కు|ది|లో|ని|ను|తో)$/u, (m) => (raw.length > m.length + 2 ? "" : m));
    w = stem(w);
    if (!STOP.has(w) && w.length > 0) out.push(w);
  }
  return out;
}
const key = (w: string) => { const g = SYN_MAP.get(w) ?? SYN_MAP.get(stem(w)); return g === undefined ? w : `#${g}`; };

export function search(question: string, docs: Doc[], people: string[] = []): Hit[] {
  const q = [...new Set(tokens(question).map(key))];
  if (!q.length || !docs.length) return [];
  const personKeys = new Set(people.flatMap((p) => tokens(p).map(key)));
  const SYNPEOPLE = new Set([5, 6, 7, 8].map((i) => `#${i}`));
  const isPerson = (k: string) => personKeys.has(k) || SYNPEOPLE.has(k);
  const intent = INTENT.find(([r]) => r.test(question))?.[1];

  const docKeys = docs.map((d) => new Set(tokens(`${d.text} ${d.about.join(" ")}`).map(key)));
  const df = (k: string) => docKeys.filter((s) => s.has(k)).length;
  const idf = new Map(q.map((k) => [k, Math.log(1 + docs.length / (1 + df(k)))]));
  const total = q.reduce((s, k) => s + (idf.get(k) ?? 0) * (isPerson(k) ? 0.7 : 1), 0);

  const hits: Hit[] = [];
  docs.forEach((d, i) => {
    const ks = docKeys[i];
    let s = 0, content = 0;
    for (const k of q) {
      let m = ks.has(k) ? 1 : 0;
      if (!m && k.length >= 4 && !k.startsWith("#")) for (const t of ks) if (t.length >= 4 && (t.startsWith(k) || k.startsWith(t))) { m = 0.6; break; }
      if (!m) continue;
      const w = (idf.get(k) ?? 0) * (isPerson(k) ? 0.7 : 1);
      s += w * m;
      if (!isPerson(k)) content += m;
    }
    if (!content) return; // matching only a name is not an answer
    let score = s / (total || 1);
    if (intent && d.topic === intent) score += 0.15;
    score += Math.min(0.05, (d.updated / 1e14));
    if (score >= 0.34) hits.push({ id: d.id, score, snippet: bestSentence(d.text, q) });
  });
  return hits.sort((a, b) => b.score - a.score);
}

function bestSentence(text: string, q: string[]) {
  if (text.length < 220) return text;
  const parts = text.split(/(?<=[.!?।\n])\s+/);
  let best = parts[0], bs = -1;
  for (const p of parts) { const ks = new Set(tokens(p).map(key)); const s = q.filter((k) => ks.has(k)).length; if (s > bs) { bs = s; best = p; } }
  return best;
}
