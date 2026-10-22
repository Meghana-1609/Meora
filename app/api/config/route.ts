import { aiReady } from "@/lib/server/ai";
// `v` = which version of Meora is live. Phones compare it and refresh themselves after an update.
const VERSION = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || "dev";
export async function GET() { return Response.json({ ai: aiReady(), v: VERSION }, { headers: { "cache-control": "no-store" } }); }
