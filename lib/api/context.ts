import type { NextRequest } from "next/server";
import { getCurrentUser, getClientIp, type CurrentUser } from "@/lib/security/auth";

export interface RequestContext {
  user: CurrentUser;
  ip: string | null;
}

export async function getRequestContext(req: NextRequest): Promise<RequestContext> {
  const user = await getCurrentUser(req);
  return { user, ip: getClientIp(req) };
}
