// Called every few minutes by a free outside timer (and once a day by Vercel), to send due reminders.
import { handle } from "@/lib/server/http";
import { tick } from "@/lib/server/push";

export const maxDuration = 60;
export async function GET() { return handle(tick); }
