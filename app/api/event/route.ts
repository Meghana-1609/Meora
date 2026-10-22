import { body, handle } from "@/lib/server/http";
import { record } from "@/lib/server/events";
export async function POST(req: Request) { return handle(async () => record(await body(req))); }
