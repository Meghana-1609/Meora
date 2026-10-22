// Optional: Google's free Gemini tier, for asking across languages and translating.
// Off unless GEMINI_API_KEY is set on the server AND the family turns on "Smart answers".
import { HttpError } from "./store";
import { serverError } from "./events";

export const aiReady = () => !!process.env.GEMINI_API_KEY;

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };
// Fast, proven model first (quick answers, good with voice); newer models are the backup.
// If Google retires, renames, limits or slows a model, the next one is tried automatically.
const TEXT_MODELS = () => [process.env.GEMINI_MODEL, "gemini-2.5-flash", "gemini-3.8-flash", "gemini-2.5-flash-lite"].filter(Boolean) as string[];
const TTS_MODELS = () => [process.env.GEMINI_TTS_MODEL, "gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts", "gemini-2.5-flash-preview-tts"].filter(Boolean) as string[];

const clean = (t: string) => t.replace(/key=[^\s&]+/g, "key=…").slice(0, 150);
/** Tries each model in turn, each with a strict time limit, and never waits more than ~45 s in total. */
async function callModels(models: string[], body: (model: string) => unknown, key: string, timeout = 15000) {
  let last: Response | null = null;
  const started = Date.now();
  for (const model of [...new Set(models)]) {
    const left = 45000 - (Date.now() - started);
    if (left < 4000) break;
    let r: Response;
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body(model)), signal: AbortSignal.timeout(Math.min(timeout, left)),
      });
    } catch (e) {
      // Too slow or no connection: note it on the admin page and try the next model.
      void serverError(`gemini ${model}: ${clean(String((e as Error)?.name === "TimeoutError" ? "took too long" : (e as Error)?.message ?? e))}`);
      continue;
    }
    if (r.ok) return r;
    // Show Google's exact reason on the admin page (no keys or notes are included).
    const why = await r.clone().text().then((t) => { try { return JSON.parse(t)?.error?.message ?? t; } catch { return t; } }).catch(() => "");
    void serverError(`gemini ${model} ${r.status}: ${clean(String(why))}`);
    if (!last || last.status !== 429) last = r;
    if (![400, 403, 404, 429, 500, 503].includes(r.status)) break;
  }
  return last ?? new Response(JSON.stringify({ error: { message: "timeout" } }), { status: 504 });
}

async function gemini(prompt: string, extra: Part[] = []): Promise<Record<string, unknown>> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new HttpError(503, "Smart answers are not set up on this server.");
  // Short "thinking" keeps answers fast (newer models think a lot by default).
  const think = (m: string) => (m.startsWith("gemini-2.5") ? { thinkingConfig: { thinkingBudget: 0 } } : m.startsWith("gemini-3") ? { thinkingConfig: { thinkingLevel: "low" } } : {});
  const r = await callModels(TEXT_MODELS(), (m) => ({ contents: [{ parts: [...extra, { text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0, ...think(m) } }), key);
  if (r.status === 429) throw new HttpError(429, "Smart answers reached today's free limit. Plain search still works.");
  if (r.status === 504) throw new HttpError(504, "Smart answers took too long. Please try again.");
  if (!r.ok) throw new HttpError(502, "Smart answers are not available right now.");
  const j = await r.json();
  const text = j?.candidates?.[0]?.content?.parts?.find((p: { text?: string }) => typeof p.text === "string")?.text ?? "{}";
  try { return JSON.parse(text); } catch { return {}; }
}

type N = { id: string; text: string; topic: string; about: string[]; by: string; date: string };
export async function aiAsk(question: string, notes: N[], lang: string) {
  if (!question || question.length > 500 || !Array.isArray(notes) || notes.length > 60) throw new HttpError(400, "Bad question.");
  const list = notes.map((n) => `[${n.id}] (${n.topic}; about: ${n.about.join(", ") || "-"}; by ${n.by}; ${n.date}) ${String(n.text).slice(0, 800)}`).join("\n");
  const out = await gemini(`You answer questions for a family using ONLY their saved notes below. Notes may be in any language.
Rules: never guess or add outside facts; if the notes do not contain the answer, set found=false. Never give medical advice beyond what a note says.
Reply in the language with code "${lang}". Keep the answer short and plain (one or two sentences).
Return JSON: {"found": boolean, "answer": string, "noteIds": string[]}.

NOTES:
${list}

QUESTION: ${question}`);
  return { found: !!out.found, answer: String(out.answer ?? ""), noteIds: Array.isArray(out.noteIds) ? out.noteIds.map(String) : [] };
}

export async function aiTranslate(text: string, to: string) {
  if (!text || text.length > 3000) throw new HttpError(400, "Too long.");
  const out = await gemini(`Translate the text into the language with code "${to}". Keep names, numbers and medicine names as they are. Return JSON {"text": string}.\n\nTEXT:\n${text}`);
  return { text: String(out.text ?? "") };
}

/** Hears any language (even Telugu and English mixed) and also gives clear English. */
export async function aiTranscribe(audio: string, mime: string, hint: string) {
  if (!audio || audio.length > 3_400_000 || !/^audio\/[\w.+-]+/.test(mime)) throw new HttpError(400, "Bad audio.");
  const out = await gemini(`Listen to this voice note from a family member. It may be in any language, often Telugu, Hindi or Tamil mixed with English words.
1) "text": write exactly what was said, in the speaker's own language and script (Telugu words in Telugu script, English words in English). Remove repeated words, "umm", false starts.
2) "english": the same meaning in short, natural, correct English.
3) "lang": the main language code (like "te", "hi", "en").
Only write words you clearly hear. Never guess, invent or complete sentences. If there is no clear speech (silence, noise, music, TV), return empty strings. About the person (a hint only, they may still mix languages): app language and usual speaking language = "${hint}".
Return JSON {"text": string, "english": string, "lang": string}.`, [{ inline_data: { mime_type: mime.split(";")[0], data: audio } }]);
  const text = String(out.text ?? "").trim();
  return { text, english: text ? String(out.english ?? "").trim() : "", lang: String(out.lang ?? "").slice(0, 8) };
}

/** A natural, human-sounding voice (Gemini text-to-speech). Returns a WAV file as base64. */
export async function aiSpeak(text: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new HttpError(503, "Not set up.");
  if (!text || text.length > 1200) throw new HttpError(400, "Too long.");
  const voice = process.env.GEMINI_VOICE || "Kore";
  // Newer voice models read the text exactly as given, so only the older preview model gets a style hint.
  const r = await callModels(TTS_MODELS(), (model) => ({
    contents: [{ parts: [{ text: model.includes("preview") ? `Say this warmly and clearly, at a calm pace, like a kind family member: ${text}` : text }] }],
    generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
  }), key);
  if (!r.ok) throw new HttpError(r.status === 429 ? 429 : 502, "Voice not available right now.");
  const j = await r.json();
  const part = j?.candidates?.[0]?.content?.parts?.find((p: { inlineData?: { data: string; mimeType: string } }) => p.inlineData)?.inlineData;
  if (!part?.data) throw new HttpError(502, "Voice not available right now.");
  const raw = Buffer.from(part.data, "base64");
  // Newer models already send a complete WAV file; older ones send raw sound that needs a WAV header.
  if (raw.subarray(0, 4).toString("ascii") === "RIFF") return { audio: raw.toString("base64"), mime: "audio/wav" };
  if (/mpeg|mp3|ogg|opus/i.test(part.mimeType ?? "")) return { audio: part.data as string, mime: String(part.mimeType).split(";")[0] };
  const rate = Number(/rate=(\d+)/.exec(part.mimeType ?? "")?.[1] ?? 24000);
  return { audio: wav(raw, rate).toString("base64"), mime: "audio/wav" };
}
function wav(pcm: Buffer, rate: number) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8); h.write("fmt ", 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

/** The help chat: answers questions about using Meora. */
export async function aiHelp(question: string, lang: string, faq: { q: string; a: string }[]) {
  if (!question || question.length > 400) throw new HttpError(400, "Bad question.");
  const out = await gemini(`You are the friendly help assistant inside the Meora app (a family memory app). Answer the user's question about using the app,
using ONLY the facts below. Be short (max 3 sentences), warm and step-by-step. Reply in the language with code "${lang}" (if the user wrote in another language, reply in that language).
If the facts don't cover it, say you're not sure and suggest the closest topic.
FACTS:
${faq.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n")}
QUESTION: ${question}
Return JSON {"answer": string}.`);
  return { answer: String(out.answer ?? "") };
}
