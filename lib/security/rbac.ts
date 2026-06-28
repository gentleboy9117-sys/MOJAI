// =====================================================================
// 권한 분리 (RBAC)
//  VIEWER  : 조회/검색
//  ANALYST : 분류 수정 / 보고서·보도자료 초안 생성
//  ADMIN   : 수집원 설정 / 사용자 관리 / 감사 로그
// =====================================================================
import type { Role } from "@/lib/types";

const RANK: Record<Role, number> = { VIEWER: 1, ANALYST: 2, ADMIN: 3 };

export function hasRole(role: Role, min: Role): boolean {
  return (RANK[role] ?? 0) >= RANK[min];
}

export const can = {
  view: (r: Role) => hasRole(r, "VIEWER"),
  editClassification: (r: Role) => hasRole(r, "ANALYST"),
  generateReport: (r: Role) => hasRole(r, "ANALYST"),
  generatePressRelease: (r: Role) => hasRole(r, "ANALYST"),
  reviewArticle: (r: Role) => hasRole(r, "ANALYST"),
  manageSources: (r: Role) => hasRole(r, "ADMIN"),
  manageUsers: (r: Role) => hasRole(r, "ADMIN"),
  viewAuditLogs: (r: Role) => hasRole(r, "ADMIN"),
};

export class ForbiddenError extends Error {
  constructor(message = "권한이 없습니다.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function assertCan(allowed: boolean, message?: string) {
  if (!allowed) throw new ForbiddenError(message);
}
