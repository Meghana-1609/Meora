import { handle } from "@/lib/server/http";
import { sync } from "@/lib/server/family";
export async function GET(req: Request) {
  const since = Number(new URL(req.url).searchParams.get("since") ?? 0) || 0;
  return handle(() => sync(req, since));
}
