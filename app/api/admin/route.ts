import { handle } from "@/lib/server/http";
import { checkAdmin, stats } from "@/lib/server/admin";
export async function GET(req: Request) { return handle(async () => { checkAdmin(req); return stats(); }); }
