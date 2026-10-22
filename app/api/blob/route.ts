import { body, handle } from "@/lib/server/http";
import { getBlob, putBlob } from "@/lib/server/family";
export async function POST(req: Request) { return handle(async () => putBlob(req, (await body(req)) as never)); }
export async function GET(req: Request) { return handle(() => getBlob(req, new URL(req.url).searchParams.get("id") ?? "")); }
