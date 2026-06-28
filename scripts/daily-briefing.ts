// 매일 오전 8시 자동 브리핑 (MVP: 수동 실행. 운영: cron/K8s CronJob/내부 배치)
//   클러스터링 → 증가감지 → 기관장용 브리핑 생성 → BriefingRun 저장
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { rebuildClusters, persistTrendAlerts } from "@/lib/pipeline/runPipeline";
import { buildReportData } from "@/lib/report/buildReportData";
import { generateReportMarkdown } from "@/lib/report/reportGenerator";
import { checkText } from "@/lib/report/riskChecker";

const DAY = 86400000;

async function main() {
  const now = new Date();
  console.log("▶ 자동 브리핑 시작");

  const clusters = await rebuildClusters(now);
  const trends = await persistTrendAlerts(now);
  console.log(`  · 클러스터 ${clusters} · 증가감지 ${trends}`);

  const start = new Date(now.getTime() - 7 * DAY);
  const data = await buildReportData({ start, end: now, generatedBy: "자동 브리핑(시스템)", now });
  const { title, markdown } = generateReportMarkdown(data, "EXEC_SUMMARY");
  const safety = checkText(markdown);
  const report = await prisma.report.create({
    data: { title, reportType: "EXEC_SUMMARY", periodStart: start, periodEnd: now, markdownContent: markdown, safetyCheckJson: JSON.stringify(safety), sourceCount: data.sources.length, issueCount: data.issueCount },
  });

  const reviewNeeded = await prisma.article.count({ where: { needsHumanReview: true } });
  const topIds = (await prisma.issueCluster.findMany({ orderBy: { issueScore: "desc" }, take: 5, select: { id: true } })).map((x) => x.id);
  await prisma.briefingRun.create({
    data: { status: "SUCCESS", articleCount: data.articleCount, issueCount: data.issueCount, reviewNeededCount: reviewNeeded, topIssueIds: JSON.stringify(topIds), reportId: report.id, message: "자동 브리핑 생성" },
  });
  console.log(`✔ 자동 브리핑 완료 — 기사 ${data.articleCount}, 이슈 ${data.issueCount}, 보고서 ${report.id}`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
