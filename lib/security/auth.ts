// =====================================================================
// 인증 컨텍스트 (MVP: 헤더/환경변수 기반)
//  * 운영 환경에서는 기관 SSO 로 교체. getCurrentUser 만 바꾸면 된다.
// =====================================================================
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { Role } from "@/lib/types";
import { ROLES } from "@/lib/types";

export interface CurrentUser {
  id: string | null;
  email: string;
  name: string;
  role: Role;
}

function coerceRole(v: string | null | undefined): Role {
  return (ROLES.includes(v as Role) ? v : "VIEWER") as Role;
}

/**
 * 현재 사용자 — 헤더(x-user-email / x-user-role) 우선, 없으면 env 기본값.
 * DB 에 해당 사용자가 있으면 id/role 을 사용한다.
 */
export async function getCurrentUser(req?: NextRequest): Promise<CurrentUser> {
  const headerEmail = req?.headers.get("x-user-email") || undefined;
  const headerRole = req?.headers.get("x-user-role") || undefined;
  const email = headerEmail || process.env.DEV_DEFAULT_USER_EMAIL || "viewer@example.go.kr";

  let dbUser: { id: string; name: string; role: string } | null = null;
  try {
    dbUser = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, role: true } });
  } catch {
    dbUser = null;
  }

  return {
    id: dbUser?.id ?? null,
    email,
    name: dbUser?.name ?? email.split("@")[0],
    role: coerceRole(headerRole || dbUser?.role || process.env.DEV_DEFAULT_USER_ROLE),
  };
}

export function getClientIp(req?: NextRequest): string | null {
  if (!req) return null;
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}
