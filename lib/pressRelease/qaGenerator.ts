// =====================================================================
// 예상 질의응답(Q&A) 생성기 (사양 6-11)
//  * 수사 중 사안은 원론적 답변
//  * 개인정보·피해자 정보는 비공개
//  * 미확인 사항은 단정/추측하지 않음, 유죄 단정 금지
//  * 입력 사실만 사용 — 약 5건
// =====================================================================
import type { PressReleaseInput } from "./types";
import { caseStageLabel } from "./types";

function isUnderInvestigation(input: PressReleaseInput): boolean {
  return (
    input.caseStage === "INVESTIGATION_STARTED" ||
    input.caseStage === "UNDER_INVESTIGATION"
  );
}

/**
 * 입력 사실을 바탕으로 예상 Q&A 생성(약 5건).
 * 답변은 항상 비식별·비단정·원론적 톤을 유지한다.
 */
export function generateQA(input: PressReleaseInput): { q: string; a: string }[] {
  const stageLabel = caseStageLabel(input.caseStage);
  const crime = input.crimeType?.trim() || "관련 범죄";
  const underInv = isUnderInvestigation(input);

  const qa: { q: string; a: string }[] = [];

  // 1) 사건 진행 단계
  qa.push({
    q: "현재 사건은 어느 단계까지 진행되었습니까?",
    a: underInv
      ? `현재 ${stageLabel} 단계로, 구체적인 내용은 수사 중인 사안이어서 공개 발표된 범위 내에서만 말씀드릴 수 있습니다. 확인되지 않은 사항은 단정해 답변드리기 어렵습니다.`
      : `공식 발표에 따르면 현재 ${stageLabel} 단계입니다. 세부 사항은 발표된 범위 내에서 안내드립니다.`,
  });

  // 2) 피의자 신원
  qa.push({
    q: "피의자의 신원이나 인적사항을 알 수 있습니까?",
    a: "개인정보 보호 및 비식별 원칙에 따라 피의자의 신원·인적사항은 공개하지 않습니다. 발표 자료에서는 'A씨' 등 비식별 표현을 사용합니다.",
  });

  // 3) 피해자 정보
  qa.push({
    q: "피해자나 피해 내용을 구체적으로 알 수 있습니까?",
    a: "피해자 보호를 위해 피해자를 특정할 수 있는 정보는 제공하지 않습니다. 피해 규모 등은 발표된 범위에서만 안내드립니다.",
  });

  // 4) 혐의 사실 확정 여부
  qa.push({
    q: `${crime} 혐의는 사실로 확정된 것입니까?`,
    a: "해당 사안은 피의자가 혐의를 받고 있는 단계로, 유무죄는 향후 재판 절차를 통해 가려집니다. 현재로서는 혐의 사실을 단정해 말씀드릴 수 없습니다.",
  });

  // 5) 향후 일정/계획 또는 추가 입건
  qa.push({
    q: "추가 입건이나 향후 계획이 있습니까?",
    a: underInv
      ? "수사 중인 사안이므로 향후 진행 사항은 확정적으로 말씀드리기 어렵습니다. 법과 원칙에 따라 필요한 절차를 진행할 예정입니다."
      : input.futurePlan?.trim()
        ? `발표 자료에 따르면 ${input.futurePlan.trim()} 다만 세부 일정은 확정되는 대로 별도로 안내드립니다.`
        : "구체적인 향후 일정은 확정되는 대로 별도로 안내드리겠습니다. 미확정 사항은 단정해 답변드리지 않습니다.",
  });

  return qa;
}
