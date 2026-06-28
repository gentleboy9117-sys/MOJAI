// =====================================================================
// 감사 로그 — 모든 조회/수집/수정/생성/다운로드 이벤트 기록
//  * 실패해도 본 요청을 막지 않도록 비차단(try/catch)
// =====================================================================
import { prisma } from "@/lib/db/prisma";

export const AUDIT_ACTIONS = {
  VIEW_ARTICLE: "VIEW_ARTICLE",
  SEARCH: "SEARCH",
  COLLECT: "COLLECT",
  CLASSIFY: "CLASSIFY",
  CLASSIFY_BATCH: "CLASSIFY_BATCH",
  CLUSTER: "CLUSTER",
  REVIEW_ARTICLE: "REVIEW_ARTICLE",
  GENERATE_REPORT: "GENERATE_REPORT",
  SYNC_OFFICES: "SYNC_OFFICES",
  VIEW_ISSUE: "VIEW_ISSUE",
  GENERATE_TREND: "GENERATE_TREND",
  CRAWL_PRESS_REF: "CRAWL_PRESS_REF",
  ANALYZE_PRESS_STYLE: "ANALYZE_PRESS_STYLE",
  GENERATE_PRESS_RELEASE: "GENERATE_PRESS_RELEASE",
  SAFETY_CHECK: "SAFETY_CHECK",
  DOWNLOAD: "DOWNLOAD",
  DAILY_BRIEFING: "DAILY_BRIEFING",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export interface AuditInput {
  userId?: string | null;
  action: AuditAction | string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch (e) {
    console.error("[AUDIT] 기록 실패:", e instanceof Error ? e.message : e);
  }
}
