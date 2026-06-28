// =====================================================================
// 보도자료 초안 안전 점검 (사양 6 위험 점검)
//  * 공통 riskChecker.checkText 를 재사용한다.
//  * 명예훼손/피의사실공표/유죄 단정/개인정보 위험을 검출(제안)한다.
// =====================================================================
import { checkText } from "@/lib/report/riskChecker";
import type { RiskCheckResult } from "@/lib/report/riskChecker";
import type { PressReleaseInput } from "./types";

export type { RiskCheckResult };

/**
 * 초안 마크다운의 문장 리스크를 점검한다.
 * input 은 향후 컨텍스트 확장을 위해 받지만, 현재는 본문 텍스트만 점검한다.
 */
export function checkPressRelease(
  draftMarkdown: string,
  _input: PressReleaseInput
): RiskCheckResult {
  return checkText(draftMarkdown || "");
}
