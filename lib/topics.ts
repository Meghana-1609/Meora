import type { TopicId } from "./types";

export type Topic = { id: TopicId; icon: string; bg: string; fg: string; words: string[] };
// Words in several languages help Meora guess the topic. You can always change it.
export const TOPICS: Topic[] = [
  { id: "health", icon: "health", bg: "#F6E3DF", fg: "#B5443A", words: ["tablet", "tablets", "medicine", "medicines", "pill", "pills", "dose", "doctor", "dr", "bp", "sugar", "diabetes", "insulin", "allergy", "allergic", "blood", "hospital", "clinic", "checkup", "syrup", "inhaler", "eye drops", "mg", "prescription", "మాత్ర", "మాత్రలు", "మందు", "మందులు", "టాబ్లెట్", "మెడిసిన్", "टैबलेट", "డాక్టర్", "షుగర్", "బీపీ", "ఆసుపత్రి", "दवा", "दवाई", "गोली", "डॉक्टर", "शुगर", "अस्पताल", "மாத்திரை", "மருந்து", "டாக்டர்", "medicina", "pastilla", "médico", "médicament", "médecin", "دواء", "طبيب", "药", "医生"] },
  { id: "contacts", icon: "phone", bg: "#E1EAF4", fg: "#3F6696", words: ["number", "phone", "mobile", "call", "contact", "plumber", "electrician", "carpenter", "milkman", "maid", "driver", "neighbour", "neighbor", "mechanic", "నంబర్", "ఫోన్", "ప్లంబర్", "ఎలక్ట్రీషియన్", "नंबर", "फ़ोन", "फोन", "प्लंबर", "बिजली वाला", "எண்", "போன்", "teléfono", "número", "téléphone", "هاتف", "رقم", "电话"] },
  { id: "where", icon: "key", bg: "#F3EBDC", fg: "#8F6A2E", words: ["where", "kept", "keep", "is in", "are in", "cupboard", "almirah", "drawer", "shelf", "box", "file", "folder", "locker", "bag", "wallet", "under", "behind", "documents", "papers", "certificate", "warranty", "keys", "key", "spare", "బీరువా", "అల్మారా", "సొరుగు", "ఫైల్", "తాళం", "ఎక్కడ", "లో ఉంది", "లో ఉన్నాయి", "अलमारी", "दराज", "चाबी", "कहाँ", "रखा", "रखी", "அலமாரி", "சாவி", "dónde", "armario", "llave", "armoire", "clé", "خزانة", "مفتاح", "钥匙", "柜"] },
  { id: "dates", icon: "cal", bg: "#E6EEE2", fg: "#4F7A47", words: ["birthday", "anniversary", "date", "due", "renewal", "expires", "expiry", "tithi", "festival", "wedding", "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december", "పుట్టినరోజు", "పెళ్లిరోజు", "తిథి", "జన్మదినం", "जन्मदिन", "सालगिरह", "बरसी", "पुण्यतिथि", "பிறந்தநாள்", "cumpleaños", "aniversario", "anniversaire", "عيد ميلاد", "生日"] },
  { id: "recipes", icon: "recipe", bg: "#F5E7D8", fg: "#A2622B", words: ["recipe", "cook", "cooking", "fry", "boil", "masala", "spoon", "cup", "salt", "dal", "curry", "sambar", "rasam", "pickle", "chutney", "biryani", "dough", "బిర్యానీ", "కూర", "పచ్చడి", "వంట", "చారు", "ఉప్పు", "रेसिपी", "खाना", "मसाला", "नमक", "दाल", "सब्ज़ी", "சமையல்", "குழம்பு", "receta", "recette", "وصفة", "菜谱"] },
  { id: "home", icon: "bulb", bg: "#ECE8F3", fg: "#5E5390", words: ["bill", "electricity", "current bill", "gas", "cylinder", "wifi", "wi-fi", "internet", "broadband", "rent", "water", "maintenance", "ac", "fridge", "washing machine", "geyser", "tv", "dth", "recharge", "కరెంట్", "గ్యాస్", "అద్దె", "నీళ్లు", "बिजली", "गैस", "किराया", "पानी", "மின்சாரம்", "எரிவாயு", "factura", "luz", "facture", "loyer", "فاتورة", "电费"] },
  { id: "money", icon: "money", bg: "#E2EEEA", fg: "#2F7D57", words: ["bank", "insurance", "policy", "lic", "agent", "loan", "emi", "fd", "fixed deposit", "mutual fund", "tax", "pension", "branch", "బ్యాంక్", "ఇన్సూరెన్స్", "పాలసీ", "లోన్", "बैंक", "बीमा", "पॉलिसी", "लोन", "வங்கி", "காப்பீடு", "banco", "seguro", "banque", "assurance", "بنك", "تأمين", "银行", "保险"] },
  { id: "kids", icon: "school", bg: "#E8EBF5", fg: "#3D4C8A", words: ["school", "teacher", "class", "tuition", "fees", "fee", "homework", "exam", "bus", "college", "uniform", "స్కూల్", "టీచర్", "ఫీజు", "ట్యూషన్", "स्कूल", "टीचर", "फीस", "பள்ளி", "ஆசிரியர்", "escuela", "école", "مدرسة", "学校"] },
  { id: "vehicles", icon: "car", bg: "#EDEAE4", fg: "#5C5A55", words: ["car", "bike", "scooter", "vehicle", "puc", "pollution", "tyre", "tire", "petrol", "diesel", "rc", "licence", "license", "కారు", "బైక్", "బండి", "कार", "बाइक", "गाड़ी", "கார்", "coche", "voiture", "سيارة", "汽车"] },
  { id: "stories", icon: "story", bg: "#F1E6EA", fg: "#8C4A62", words: ["story", "remember when", "childhood", "used to", "village", "grandfather", "grandmother", "memory", "కథ", "చిన్నప్పుడు", "ఊరు", "कहानी", "बचपन", "गाँव", "கதை", "historia", "histoire", "قصة", "故事"] },
  { id: "diary", icon: "book", bg: "#E4EAF4", fg: "#3F5A96", words: [] },
  { id: "other", icon: "dots", bg: "#EEEBE5", fg: "#5F6472", words: [] },
];
export const topic = (id: TopicId) => TOPICS.find((t) => t.id === id) ?? TOPICS[TOPICS.length - 1];

export function guessTopic(text: string): TopicId {
  const low = " " + text.toLowerCase() + " ";
  let best: TopicId = "other", score = 0;
  for (const t of TOPICS) {
    let s = 0;
    for (const w of t.words) {
      const ascii = /^[a-z0-9 \-]+$/.test(w);
      const hit = ascii ? new RegExp(`[^a-z0-9]${w.replace(/[-]/g, "\\-")}[^a-z0-9]`).test(low) : low.includes(w);
      if (hit) s += w.length > 3 ? 2 : 1;
    }
    if (t.id === "contacts" && /(?:\+?\d[\s-]?){10,13}/.test(text)) s += 3;
    if (t.id === "dates" && /\b\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(text)) s += 3;
    if (s > score) { score = s; best = t.id; }
  }
  return best;
}

// Family words, so "Amma's tablet" is filed under Amma.
const RELATIONS = ["amma", "nanna", "ammamma", "nannamma", "thatha", "tatayya", "akka", "anna", "chelli", "thammudu", "mom", "dad", "mum", "mother", "father", "grandma", "grandpa", "granny", "papa", "mama", "maa", "mummy", "daddy", "dadi", "nani", "dada", "nana", "bhaiya", "didi", "అమ్మ", "నాన్న", "అమ్మమ్మ", "నాన్నమ్మ", "తాతయ్య", "తాత", "అక్క", "అన్న", "చెల్లి", "తమ్ముడు", "माँ", "मां", "पापा", "दादी", "नानी", "दादा", "नाना", "भैया", "दीदी", "அம்மா", "அப்பா", "பாட்டி", "தாத்தா"];
export function guessAbout(text: string, names: string[]): string[] {
  const low = text.toLowerCase();
  const found: string[] = [];
  for (const n of names) {
    const first = n.toLowerCase().split(" ")[0];
    if (first.length > 1 && new RegExp(`(^|[^\\p{L}])${first.replace(/[.*+?^${}()|[\]\\]/g, "")}`, "u").test(low)) found.push(n);
  }
  for (const r of RELATIONS) {
    if (new RegExp(`(^|[^\\p{L}])${r}(?=$|[^\\p{L}\\p{M}]|'|’|s\\b|గారి|కి|కు|ది|కీ|की|का|के)`, "u").test(low)) {
      const cap = r[0].toUpperCase() + r.slice(1);
      if (!found.some((f) => f.toLowerCase() === r)) found.push(cap);
    }
  }
  return found.slice(0, 3);
}
