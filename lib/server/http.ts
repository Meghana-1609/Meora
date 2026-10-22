import { HttpError } from "./store";
import { serverError } from "./events";
export async function body(req: Request): Promise<Record<string, unknown>> {
  try { const b = await req.json(); return b && typeof b === "object" ? b : {}; } catch { return {}; }
}
export async function handle(fn: () => Promise<unknown>) {
  try { return Response.json(await fn(), { headers: { "cache-control": "no-store" } }); }
  catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) { console.error(e); await serverError(e); }
    return Response.json({ error: status === 500 ? "Something went wrong. Please try again." : (e as Error).message }, { status });
  }
}
