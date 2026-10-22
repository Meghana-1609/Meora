import { aiReady } from "@/lib/server/ai";
export async function GET() { return Response.json({ ai: aiReady() }, { headers: { "cache-control": "no-store" } }); }
