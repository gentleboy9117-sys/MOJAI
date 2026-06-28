// =====================================================================
// 공통 문장 리스크 점검기 (보고서 + 보도자료 초안)
//  * 피의사실/유죄 단정, 개인정보·피해자 식별, 명예훼손, 과장 표현 점검
//  * 검출만 하고 자동 적용은 하지 않는다(제안). safetyRewrite 로 완화 가능.
// =====================================================================
import { RISK_RULES, rewriteText, type RiskType } from "./safetyRewrite";

export interface RiskFinding {
  originalText: string;
  riskType: RiskType | "개인정보/식별 위험";
  suggestedText: string;
  reason: string;
  severity: "low" | "medium" | "high";
}

export interface RiskCheckResult {
  riskLevel: "low" | "medium" | "high";
  findings: RiskFinding[];
  summary: string;
}

const PII_RULES: { pattern: RegExp; reason: string; severity: "high" | "medium" }[] = [
  { pattern: /\d{6}[-\s]?[1-4]\d{6}/g, reason: "주민등록번호 형식 — 개인정보 노출 위험", severity: "high" },
  { pattern: /01[016-9][-\s]?\d{3,4}[-\s]?\d{4}/g, reason: "휴대전화번호 형식 — 개인정보 노출 위험", severity: "medium" },
  { pattern: /피해자\s?[가-힣]{2,4}(씨|군|양)/g, reason: "피해자 식별 가능 표현 — 비식별화 필요", severity: "high" },
];

function splitSentences(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.?!。])\s+|(?<=다\.)\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function checkText(text: string): RiskCheckResult {
  const findings: RiskFinding[] = [];
  const sentences = splitSentences(text);

  for (const sentence of sentences) {
    for (const rule of RISK_RULES) {
      // 전역 정규식 재사용 시 lastIndex 이슈 방지
      const re = new RegExp(rule.pattern.source, "g");
      if (re.test(sentence)) {
        findings.push({
          originalText: sentence,
          riskType: rule.riskType,
          suggestedText: rewriteText(sentence).text,
          reason: rule.reason,
          severity: rule.severity,
        });
        break; // 문장당 1건만(중복 방지)
      }
    }
    for (const pii of PII_RULES) {
      const re = new RegExp(pii.pattern.source, "g");
      if (re.test(sentence)) {
        findings.push({
          originalText: sentence,
          riskType: "개인정보/식별 위험",
          suggestedText: sentence.replace(re, "○○○"),
          reason: pii.reason,
          severity: pii.severity,
        });
        break;
      }
    }
  }

  const hasHigh = findings.some((f) => f.severity === "high");
  const hasMed = findings.some((f) => f.severity === "medium");
  const riskLevel = hasHigh ? "high" : hasMed ? "medium" : "low";
  const summary =
    findings.length === 0
      ? "검출된 고위험 표현이 없습니다. 그래도 최종 배포 전 담당자 검토가 필요합니다."
      : `${findings.length}건의 주의 표현이 검출되었습니다(${riskLevel.toUpperCase()}). 제안 표현으로 완화를 검토하세요.`;

  return { riskLevel, findings, summary };
}
