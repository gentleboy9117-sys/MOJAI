// =====================================================================
// 이슈 중요도 스코어링 (0~100)
//  * UI 표현은 '범죄 위험도'가 아니라 보도 파급도/조직 대응 참고도/정책 참고도.
//  * '공개 보도 기준' 임을 항상 함께 표시한다.
// =====================================================================

export type IssueLevel = "low" | "medium" | "high" | "critical";

export const ISSUE_LEVEL_LABEL: Record<IssueLevel, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
  critical: "매우 높음",
};

/** 같은 점수를 세 관점으로 표기(스펙 4-7). 기본 표기는 '보도 파급도'. */
export const METRIC_LABELS = {
  primary: "보도 파급도",
  alts: ["조직 대응 참고도", "정책 참고도"],
  basis: "공개 보도 기준",
} as const;

export interface IssueScoreInput {
  articleCount: number;
  sourceCount: number;
  recent24hCount: number;
  hasOfficialPress: boolean;
  hasMediaCoverage: boolean;
  crossOffice: boolean;
  highImpactGroups: string[]; // 고위공직자/대기업/금융/마약/아동청소년/선거/중대재해/사회적파급
  directOfficeMention: boolean;
}

export interface IssueScoreResult {
  issueScore: number;
  issueLevel: IssueLevel;
  scoreReasons: string[];
}

function levelOf(score: number): IssueLevel {
  if (score >= 80) return "critical";
  if (score >= 55) return "high";
  if (score >= 30) return "medium";
  return "low";
}

export function scoreIssue(input: IssueScoreInput): IssueScoreResult {
  let score = 0;
  const reasons: string[] = [];

  const aPts = Math.min(20, Math.max(0, input.articleCount - 1) * 5);
  if (aPts > 0) {
    score += aPts;
    if (input.articleCount >= 3) reasons.push(`${input.articleCount}건 이상 반복 보도`);
  }

  const sPts = Math.min(20, input.sourceCount * 5);
  score += sPts;
  if (input.sourceCount >= 3) reasons.push(`${input.sourceCount}개 출처에서 보도`);

  const rPts = Math.min(15, input.recent24hCount * 5);
  if (rPts > 0) {
    score += rPts;
    if (input.recent24hCount >= 2) reasons.push("최근 24시간 내 후속 보도 증가");
  }

  if (input.directOfficeMention) {
    score += 10;
    reasons.push("검찰청 직접 언급");
  }

  const impactPts = Math.min(24, input.highImpactGroups.length * 6);
  if (impactPts > 0) {
    score += impactPts;
    reasons.push(`사회적 파급 키워드 포함(${input.highImpactGroups.join(", ")})`);
  }

  if (input.crossOffice) {
    score += 8;
    reasons.push("복수 검찰청 관할에 걸친 이슈");
  }

  if (input.hasOfficialPress && input.hasMediaCoverage) {
    score += 8;
    reasons.push("공식 보도자료와 언론 보도가 함께 존재");
  }

  const issueScore = Math.max(0, Math.min(100, Math.round(score)));
  return { issueScore, issueLevel: levelOf(issueScore), scoreReasons: reasons.length ? reasons : ["단일 보도 · 추가 관찰 필요"] };
}
