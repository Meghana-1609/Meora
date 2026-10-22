import { body, handle } from "@/lib/server/http";
import { putItems } from "@/lib/server/family";
export async function POST(req: Request) { return handle(async () => putItems(req, (await body(req)).items)); }
