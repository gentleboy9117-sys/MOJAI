import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, fail, handle, ERROR } from "@/lib/api/response";
import { getRequestContext } from "@/lib/api/context";
import { writeAudit, AUDIT_ACTIONS } from "@/lib/security/audit";
import { OFFICE_MATCH_LABEL, INFERRED_MATCH_TYPES, type OfficeMatchType } from "@/lib/classifiers/types";
import { ISSUE_LEVEL_LABEL, type IssueLevel } from "@/lib/scoring/issueScorer";
import { ENTITY_TYPE_LABEL, type EntityType } from "@/lib/entities/entityExtractor";
import { LEGAL_DISCLAIMER } from "@/lib/legal/legalKeywordMatcher";
import { asArray } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    const a = await prisma.article.findUnique({
      where: { id: params.id },
      include: {
        classifications: { include: { prosecutionOffice: { select: { id: true, name: true, type: true, region: true } } }, orderBy: { confidence: "desc" } },
        entities: true,
        legalMatches: true,
        issueCluster: { select: { id: true, title: true, issueLevel: true, issueScore: true, articleCount: true } },
      },
    });
    if (!a) return fail(...ERROR.NOT_FOUND);

    const ctx = await getRequestContext(req);
    await writeAudit({ userId: ctx.user.id, action: AUDIT_ACTIONS.VIEW_ARTICLE, targetType: "Article", targetId: a.id, ipAddress: ctx.ip });

    const display = a.canDisplayFullText;

    // 관할 분류 후보
    const offices = a.classifications
      .filter((c) => c.prosecutionOffice)
      .map((c) => {
        const mt = (c.officeMatchType as OfficeMatchType) ?? "LLM_ASSIST";
        return {
          officeId: c.prosecutionOfficeId,
          officeName: c.prosecutionOffice!.name,
          officeType: c.prosecutionOffice!.type,
          confidence: c.confidence,
          matchType: mt,
          matchLabel: OFFICE_MATCH_LABEL[mt] ?? mt,
          inferred: INFERRED_MATCH_TYPES.includes(mt),
          reason: c.reason,
          isPrimary: c.isPrimary,
        };
      });
    const primary = offices.find((o) => o.isPrimary) ?? offices[0];

    // AI 분류 근거(키워드/본문 기반)
    const primaryClass = a.classifications.find((c) => c.isPrimary) ?? a.classifications[0];
    const evidence = primaryClass ? asArray<string>(primaryClass.evidenceKeywords) : [];
    const classificationReasons: string[] = [];
    if (a.crimeType) classificationReasons.push(`범죄유형 '${a.crimeType}${a.crimeSubtype ? `/${a.crimeSubtype}` : ""}' — 근거 키워드: ${evidence.slice(0, 5).join(", ") || "본문 표현"}`);
    if (primary) classificationReasons.push(`관할 추정(${primary.matchLabel}${primary.inferred ? " · 추정" : ""}): ${primary.reason ?? primary.officeName}`);
    else classificationReasons.push("관할 추정: 검찰청/관할지역 키워드 미식별 — 추정 불가");

    // 엔티티 그룹핑
    const grouped: Partial<Record<EntityType, string[]>> = {};
    for (const e of a.entities) {
      const t = e.entityType as EntityType;
      (grouped[t] ??= []);
      if (!grouped[t]!.includes(e.entityText)) grouped[t]!.push(e.entityText);
    }
    const entities = Object.entries(grouped).map(([type, items]) => ({
      type, label: ENTITY_TYPE_LABEL[type as EntityType] ?? type, items,
    }));

    const dto = {
      id: a.id,
      title: a.title,
      sourceName: a.sourceName,
      sourceType: a.sourceType,
      publishedAt: a.publishedAt,
      collectedAt: a.collectedAt,
      originalUrl: a.resolvedUrl ?? a.originalUrl, // 실제 원문 URL 우선(구글 리다이렉트 회피)
      summary: a.summary,
      // 표시 권한 없으면 원문 본문 미제공
      fullText: display ? a.fullText : null,
      restricted: !display,
      canDisplayFullText: a.canDisplayFullText,
      canStoreFullText: a.canStoreFullText,
      licenseType: a.licenseType,
      copyrightNotice: a.copyrightNotice,
      crimeType: a.crimeType,
      crimeSubtype: a.crimeSubtype,
      classifyConfidence: a.classifyConfidence,
      officeConfidence: a.officeConfidence,
      officeMatchType: a.officeMatchType,
      issueScore: a.issueScore,
      issueLevel: a.issueLevel,
      issueLevelLabel: a.issueLevel ? ISSUE_LEVEL_LABEL[a.issueLevel as IssueLevel] ?? a.issueLevel : null,
      needsHumanReview: a.needsHumanReview,
      reviewReasons: asArray<string>(a.reviewReasons),
      keywords: asArray<string>(a.keywords),
      primaryOffice: primary ?? null,
      offices,
      classificationReasons,
      entities,
      legalMatches: a.legalMatches.map((l) => ({ keyword: l.keyword, category: l.category, confidence: l.confidence, evidenceText: l.evidenceText })),
      legalDisclaimer: LEGAL_DISCLAIMER,
      issueCluster: a.issueCluster,
    };
    return ok(dto);
  });
}
