// =====================================================================
// 민감 표현 자동 완화 (보고서/보도자료 초안 공통)
//  * 명예훼손·피의사실 단정·유죄 단정·과잉 표현을 완화한다.
//  * 보도/공식발표 기반 표현으로 치환한다.
// =====================================================================

export type RiskType =
  | "피의사실 단정"
  | "유죄 단정"
  | "과장/감정 표현"
  | "단정 표현"
  | "개인정보/식별 위험";

export interface RiskRule {
  id: string;
  pattern: RegExp;
  soft: string;
  riskType: RiskType;
  reason: string;
  severity: "low" | "medium" | "high";
}

// 순서 중요(긴 표현 먼저)
export const RISK_RULES: RiskRule[] = [
  { id: "confirmed_guilt", pattern: /범죄자(이다|입니다)?/g, soft: "혐의를 받고 있는 사람", riskType: "유죄 단정", reason: "유죄 확정 전 단정 표현", severity: "high" },
  { id: "ringleader", pattern: /주범(이다|입니다)?/g, soft: "주된 혐의를 받는 사람으로 알려졌다", riskType: "유죄 단정", reason: "역할 단정 표현 완화", severity: "high" },
  { id: "embezzled", pattern: /편취했다/g, soft: "편취한 혐의를 받고 있는 것으로 알려졌다", riskType: "피의사실 단정", reason: "혐의 확정 전 단정 완화", severity: "high" },
  { id: "embezzle2", pattern: /횡령했다/g, soft: "횡령한 혐의를 받고 있는 것으로 알려졌다", riskType: "피의사실 단정", reason: "혐의 확정 전 단정 완화", severity: "high" },
  { id: "breach", pattern: /배임했다/g, soft: "배임 혐의를 받고 있는 것으로 알려졌다", riskType: "피의사실 단정", reason: "혐의 확정 전 단정 완화", severity: "high" },
  { id: "committed", pattern: /범행했다|범행을 저질렀다/g, soft: "관련 혐의를 받고 있는 것으로 알려졌다", riskType: "피의사실 단정", reason: "범행 단정 완화", severity: "high" },
  { id: "participated", pattern: /가담했다/g, soft: "가담한 혐의를 받고 있는 것으로 알려졌다", riskType: "피의사실 단정", reason: "가담 단정 완화", severity: "medium" },
  { id: "illegal", pattern: /불법이다|불법입니다/g, soft: "관련 법 위반 여부가 쟁점이 되고 있다", riskType: "단정 표현", reason: "위법성 단정 완화", severity: "medium" },
  { id: "confirmed", pattern: /확정됐다|확정되었다/g, soft: "관련 절차가 진행 중인 것으로 알려졌다", riskType: "단정 표현", reason: "확정 단정 완화", severity: "medium" },
  { id: "obvious", pattern: /명백하다|명백히/g, soft: "보도에 따르면", riskType: "단정 표현", reason: "단정 부사 완화", severity: "low" },
  { id: "must_punish", pattern: /반드시 엄벌|처벌받아야 한다|엄벌에 처해야/g, soft: "법과 원칙에 따라 처리될 필요가 있다는 지적이 있다", riskType: "과장/감정 표현", reason: "처벌 단정/감정 표현 완화", severity: "medium" },
  { id: "vicious", pattern: /악질적(이다|인)?/g, soft: "사안이 중한 것으로 보도된", riskType: "과장/감정 표현", reason: "감정적 표현 완화", severity: "low" },
  { id: "public_anger", pattern: /국민적 공분/g, soft: "사회적 관심", riskType: "과장/감정 표현", reason: "감정적 표현 완화", severity: "low" },
];

export interface RewriteChange { from: string; to: string; riskType: RiskType; }
export interface RewriteResult { text: string; changes: RewriteChange[]; }

/** 텍스트 자동 완화 */
export function rewriteText(input: string): RewriteResult {
  let text = input;
  const changes: RewriteChange[] = [];
  for (const rule of RISK_RULES) {
    if (rule.pattern.test(text)) {
      // 매칭 원형 보존을 위해 첫 매칭 샘플 기록
      const sample = input.match(rule.pattern)?.[0];
      text = text.replace(rule.pattern, rule.soft);
      if (sample) changes.push({ from: sample, to: rule.soft, riskType: rule.riskType });
    }
  }
  return { text, changes };
}

/** 보고서/보도자료 전체(문단 배열)에 완화 적용 */
export function rewriteMarkdown(markdown: string): RewriteResult {
  return rewriteText(markdown);
}
