import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, fail, handle, ERROR } from "@/lib/api/response";
import { getRequestContext } from "@/lib/api/context";
import { writeAudit, AUDIT_ACTIONS } from "@/lib/security/audit";
import { ISSUE_LEVEL_LABEL, METRIC_LABELS, type IssueLevel } from "@/lib/scoring/issueScorer";
import { SPREAD_LABEL, type SpreadStatus } from "@/lib/scoring/spreadDetector";
import { ENTITY_TYPE_LABEL, type EntityType } from "@/lib/entities/entityExtractor";
import { asArray } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface GraphNode { id: string; type: string; label: string }
interface GraphEdge { source: string; target: string; type: string }

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    const c = await prisma.issueCluster.findUnique({
      where: { id: params.id },
      include: {
        articles: { orderBy: { publishedAt: "asc" } },
        timelineEvents: { orderBy: { eventDate: "asc" } },
      },
    });
    if (!c) return fail(...ERROR.NOT_FOUND);

    const ctx = await getRequestContext(req);
    await writeAudit({ userId: ctx.user.id, action: AUDIT_ACTIONS.VIEW_ISSUE, targetType: "IssueCluster", targetId: c.id, ipAddress: ctx.ip });

    const memberIds = c.articles.map((a) => a.id);
    const [entityRows, legalRows] = await Promise.all([
      prisma.articleEntity.findMany({ where: { articleId: { in: memberIds } } }),
      prisma.legalKeywordMatch.findMany({ where: { articleId: { in: memberIds } } }),
    ]);

    // 엔티티 그룹(중복 제거)
    const grouped: Partial<Record<EntityType, string[]>> = {};
    for (const e of entityRows) {
      const t = e.entityType as EntityType;
      (grouped[t] ??= []);
      if (!grouped[t]!.includes(e.entityText)) grouped[t]!.push(e.entityText);
    }
    const entities = Object.entries(grouped).map(([type, items]) => ({ type, label: ENTITY_TYPE_LABEL[type as EntityType] ?? type, items: items.slice(0, 10) }));

    const legalSeen = new Set<string>();
    const legal = legalRows.filter((l) => (legalSeen.has(l.keyword) ? false : (legalSeen.add(l.keyword), true))).map((l) => ({ keyword: l.keyword, category: l.category, confidence: l.confidence }));

    // 관계도 그래프(<=20 노드)
    const nodes: GraphNode[] = [{ id: "issue", type: "issue", label: c.title.slice(0, 24) }];
    const edges: GraphEdge[] = [];
    if (c.mainOfficeName) { nodes.push({ id: "office", type: "office", label: c.mainOfficeName }); edges.push({ source: "issue", target: "office", type: "related_to" }); }
    if (c.mainCrimeType) { nodes.push({ id: "crime", type: "crime", label: c.mainCrimeType }); edges.push({ source: "issue", target: "crime", type: "classified_as" }); }
    if (c.mainRegion) { nodes.push({ id: "region", type: "region", label: c.mainRegion }); edges.push({ source: "issue", target: "region", type: "located_in" }); }
    const topEntities = [...(grouped.COMPANY ?? []), ...(grouped.FINANCE ?? []), ...(grouped.GOV ?? []), ...(grouped.PROSECUTION ?? []), ...(grouped.LAW ?? [])].slice(0, 5);
    topEntities.forEach((e, i) => { nodes.push({ id: `ent${i}`, type: "entity", label: e }); edges.push({ source: "issue", target: `ent${i}`, type: "mentioned_in" }); });
    c.articles.slice(0, 6).forEach((a, i) => { nodes.push({ id: `art${i}`, type: "article", label: a.sourceName }); edges.push({ source: "issue", target: `art${i}`, type: "reported_by" }); });

    const level = (c.issueLevel as IssueLevel) ?? "low";
    const spread = (c.spreadStatus as SpreadStatus) ?? "NEW";

    return ok({
      id: c.id,
      title: c.title,
      summary: c.summary,
      officeName: c.mainOfficeName,
      crimeType: c.mainCrimeType,
      region: c.mainRegion,
      representativeArticleId: c.representativeArticleId,
      metric: { primary: METRIC_LABELS.primary, basis: METRIC_LABELS.basis, score: c.issueScore, level, levelLabel: ISSUE_LEVEL_LABEL[level] ?? level },
      scoreReasons: asArray<string>(c.scoreReasons),
      spreadStatus: spread,
      spreadLabel: SPREAD_LABEL[spread] ?? spread,
      firstPublishedAt: c.firstPublishedAt,
      lastPublishedAt: c.lastPublishedAt,
      articleCount: c.articleCount,
      sourceCount: c.sourceCount,
      recent24hCount: c.recent24hCount,
      crossOffice: c.crossOffice,
      hasOfficialPress: c.hasOfficialPress,
      hasMediaCoverage: c.hasMediaCoverage,
      articles: c.articles.map((a) => ({
        id: a.id, title: a.title, sourceName: a.sourceName, sourceType: a.sourceType,
        publishedAt: a.publishedAt, summary: a.summary, canDisplayFullText: a.canDisplayFullText,
        officeMatchType: a.officeMatchType, crimeType: a.crimeType, needsHumanReview: a.needsHumanReview,
      })),
      timeline: c.timelineEvents.map((t) => ({ eventDate: t.eventDate, eventTitle: t.eventTitle, eventSummary: t.eventSummary, sourceType: t.sourceType, confidence: t.confidence })),
      entities,
      legal,
      graph: { nodes, edges },
    });
  });
}
