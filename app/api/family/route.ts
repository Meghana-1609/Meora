import { body, handle } from "@/lib/server/http";
import { createFamily, decide, invite, join, joinStatus, memberAction, setRecovery, useRecovery } from "@/lib/server/family";
import { HttpError } from "@/lib/server/store";

export async function POST(req: Request) {
  return handle(async () => {
    const b = await body(req);
    switch (b.action) {
      case "create": return createFamily(b as never);
      case "invite": return invite(req);
      case "join": return join(b as never);
      case "status": return joinStatus(b as never);
      case "decide": return decide(req, b as never);
      case "member": return memberAction(req, b.m as never ?? {});
      case "recovery-set": return setRecovery(req, b as never);
      case "recovery-use": return useRecovery(b as never);
      default: throw new HttpError(400, "Unknown action.");
    }
  });
}
