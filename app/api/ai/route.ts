import { body, handle } from "@/lib/server/http";
import { auth } from "@/lib/server/family";
import { aiAsk, aiHelp, aiSpeak, aiTranscribe, aiTranslate } from "@/lib/server/ai";
import { FAQ } from "@/lib/faq";
export async function POST(req: Request) {
  return handle(async () => {
    await auth(req);
    const b = await body(req);
    switch (b.task) {
      case "translate": return aiTranslate(String(b.text ?? ""), String(b.to ?? "en"));
      case "transcribe": return aiTranscribe(String(b.audio ?? ""), String(b.mime ?? ""), String(b.lang ?? "en"));
      case "speak": return aiSpeak(String(b.text ?? ""));
      case "help": return aiHelp(String(b.question ?? ""), String(b.lang ?? "en"), FAQ);
      default: return aiAsk(String(b.question ?? ""), b.notes as never, String(b.lang ?? "en"));
    }
  });
}
