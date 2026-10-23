import { body, handle } from "@/lib/server/http";
import { offPush, publicKey, savePush } from "@/lib/server/push";
import { HttpError } from "@/lib/server/store";

export async function GET() { return handle(publicKey); }
export async function POST(req: Request) {
  return handle(async () => {
    const b = await body(req);
    if (b.action === "save") return savePush(req, b);
    if (b.action === "off") return offPush(req);
    throw new HttpError(400, "Unknown action.");
  });
}
