// =====================================================================
// 보도자료 초안 생성기 — 검찰 보도자료 표준 양식
//  * 양식 컨텍스트: 공개 검찰발표자료(대검찰청·서울중앙지검) 형식·문체만 참고.
//    레퍼런스의 사실관계(인물·금액·일자·내용)는 절대 차용/창작하지 않는다.
//  * 입력된 '사건 처리 결과 사실'만 사용. 없는 사실은 만들지 않는다.
//  * 모든 산출물은 '초안 — 담당자 검토 필요', 유죄 단정 금지, 비식별(A씨).
// =====================================================================
import { getLlmProvider } from "@/lib/providers/llm";
import { rewriteText } from "@/lib/report/safetyRewrite";
import type { GeneratedDraft, PressReleaseInput, SelectedReference } from "./types";
import { releaseTypeLabel, caseStageLabel } from "./types";
import { TITLE_PATTERNS, classifyTitlePattern, templateForType, fillTemplate } from "./titlePatternAnalyzer";
import { generateQA } from "./qaGenerator";
import { generateChecklist } from "./checklistGenerator";
import { checkPressRelease } from "./pressReleaseSafetyChecker";

// ---------------------------------------------------------------------
// 시스템 프롬프트 — 검찰 보도자료 표준 양식(대검/서울중앙지검 PDF 기준)
// ---------------------------------------------------------------------
export const PRESS_RELEASE_SYSTEM_PROMPT = `당신은 검찰청 공보 담당자를 보조하는 '검찰 보도자료 초안 작성 도우미'입니다.

[역할과 한계]
- 사용자가 입력한 '사건 처리 결과 사실'만 사용해 보도자료 '초안'을 작성합니다.
- 함께 제공되는 공개 검찰발표자료(대검찰청·서울중앙지방검찰청)는 오직 '형식·구조·문체·제목 패턴' 참고용입니다.
- 레퍼런스의 구체적 사실(인물, 금액, 일자, 사건 내용)을 절대 인용·복사·차용하지 마십시오.
- 입력에 없는 사실(수치·일자·인명·기관명·혐의 등)을 새로 만들지 마십시오. 없으면 비워 두거나 '발표 자료 참조'로 둡니다.

[검찰 보도자료 표준 양식 — 이 형식을 그대로 따른다]
1) 최상단 보도 유의 문구(인용): "이 보도자료를 통해 공개되는 범죄사실은 재판에 의하여 확정된 사실이 아님을 유의하여 주시기 바랍니다."
2) 발표 기관 헤더: 기관명 · '보도자료' · 배포일 · 자료문의(부서)
3) 제목(굵게) + 필요 시 부제( – 핵심 메시지/수치 – )
4) 【주요 내용】 요약: ○ 불릿으로 사건 핵심과 처분 결과 요약
5) 번호 섹션
   Ⅰ. 피의자(피고인) 및 공소사실 요지 — 피의자는 A, B 등 익명, 처분(구속/불구속 기소 등) 표기, 공소사실은 【죄명】을 대괄호로
   Ⅱ. 수사 경과 — ○ 날짜·경과(발표 범위 내), ※ 보완·협력 등 주석
   Ⅲ. 수사 결과 및 의의 — ○ 결과·의의, 피해 규모는 '발표 범위 기준'
   Ⅳ. 향후 계획 — ○ 공소유지·재발방지 등
6) 마커: 주 항목 ○, 하위 -, 주석 ※, 끝 표시 ▨

[표현 규칙]
- 유죄 단정 금지: '혐의를 받고 있다', '~한 것으로 알려졌다'. 확정 전에는 '~ 혐의로 기소'.
- 피의자·피해자 비식별(A씨/B). 실명·주민번호·연락처·피해자 식별정보 금지.
- 감정적·과장 표현(악질적, 반드시 엄벌, 국민적 공분 등) 금지. 사실 위주로 간결.
- 결과물은 '초안'이며 배포 전 담당자 검토 문구를 포함.

[출력] 위 양식을 따른 Markdown. 헤딩은 ##/### 사용, 섹션은 'Ⅰ. …' 형태.`;

function lengthHint(input: PressReleaseInput): string {
  switch (input.lengthOption) {
    case "short": return "각 항목을 1~2문장으로 간결하게.";
    case "detailed": return "각 항목을 충분히(3~5문장) 서술하되 사실을 창작하지 말 것.";
    default: return "각 항목을 2~3문장으로 균형 있게.";
  }
}

function buildUserPrompt(input: PressReleaseInput, references: SelectedReference[]): string {
  const facts = {
    발표주체: input.officeName, 발표유형: releaseTypeLabel(input.releaseType), 사건단계: caseStageLabel(input.caseStage),
    범죄유형: input.crimeType, 사건개요: input.caseSummary, 적용혐의: input.charges, 법률키워드: input.legalKeywords,
    피의자설명: input.suspectDescription, 피해자설명: input.victimDescription, 피해규모: input.damageScale,
    수사결과: input.investigationResult, 처분결과: input.dispositionResult, 향후계획: input.futurePlan,
    공개범위: input.publicScope, 비식별규칙: input.anonymizationRules, 강조메시지: input.emphasisMessage, 첨부자료: input.attachments,
  };
  const styleRefs = references.map((r) => ({ 제목: r.title, 제목형식: r.titlePatternType, 발표청: r.officeName }));
  return [
    "[입력된 사건 처리 결과 사실] — 아래 사실만 사용하십시오.",
    JSON.stringify(facts, null, 2), "",
    "[참고 발표자료(형식 전용)] — 제목/구조/어조만 참고하고 사실은 절대 차용하지 마십시오.",
    JSON.stringify(styleRefs, null, 2), "",
    `[작성 지침] ${lengthHint(input)} 위 '검찰 보도자료 표준 양식'을 그대로 따라 '초안'을 Markdown 으로 작성하십시오.`,
  ].join("\n");
}

function buildTitleCandidates(input: PressReleaseInput): string[] {
  const office = input.officeName?.trim() || "○○지방검찰청";
  const crime = input.crimeType?.trim() || "관련 범죄";
  const disposition = input.dispositionResult?.trim() || caseStageLabel(input.caseStage);
  const keyword = (input.legalKeywords && input.legalKeywords[0]) || "";
  const wantType = classifyTitlePattern(`${crime} ${disposition}`).type;
  const ordered = [wantType, "수사 결과 발표형", "성과 발표형", "정책 대응형", "범죄 근절 캠페인형"];
  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const type of ordered) {
    if (seen.has(type)) continue;
    seen.add(type);
    const title = fillTemplate(templateForType(type), { office, crime, disposition, keyword });
    if (title && !candidates.includes(title)) candidates.push(title);
    if (candidates.length >= 5) break;
  }
  let i = 0;
  while (candidates.length < 5 && i < TITLE_PATTERNS.length) {
    const t = fillTemplate(TITLE_PATTERNS[i].exampleTemplate, { office, crime, disposition, keyword });
    if (t && !candidates.includes(t)) candidates.push(t);
    i += 1;
  }
  return candidates.slice(0, 5);
}

function val(s: string | undefined | null, fallback = "발표 자료 참조"): string {
  const v = (s || "").trim();
  return v.length ? v : fallback;
}

// 검찰 보도자료 표준 양식 폴백 (입력 사실만 사용)
function buildFallbackMarkdown(input: PressReleaseInput, title: string): string {
  const office = val(input.officeName, "○○지방검찰청");
  const crime = val(input.crimeType, "관련 범죄");
  const stage = caseStageLabel(input.caseStage);
  const suspect = val(input.suspectDescription, "A");
  const charges = val(input.charges, "관련 혐의");
  const L: string[] = [];

  // 1) 보도 유의 문구(서울중앙지검 표준 양식)
  L.push("이 보도자료는 배포 즉시 보도하여 주시고, 공개되는 범죄사실은 재판에 의하여 확정된 사실이 아님을 유의하여 주시기 바랍니다.");
  L.push("");
  // 2) 발표 기관 헤더(검찰청 · 전문공보관 · 연락처)
  L.push(`**${office}**`);
  L.push(`전문공보관 ${val(input.spokesperson, "○○○")} ｜ 전화 ${val(input.contactPhone, "(   )")} ｜ 팩스 ${val(input.contactFax, "(   )")}`);
  L.push("");
  L.push(`**보 도 자 료**　　${val(input.releaseDate, "(배포일 기재)")}`);
  L.push("");
  // 3) 제목 + 부제(핵심 수치 요약)
  L.push(`# ${title}`);
  if (input.emphasisMessage?.trim()) L.push(`### - ${input.emphasisMessage.trim()} -`);
  L.push("");
  // 4) 공소제기 후 공개의 요건 및 범위
  L.push("**공소제기 후 공개의 요건 및 범위**");
  L.push("☑ 피고인, 죄명, 공소사실 요지, 공소제기 일시·방식, 수사경위·수사상황, 범행경과 및 수사의 의의 등(「형사사건 공개금지 등에 관한 규정」 제11조 제1항)");
  L.push("☑ 제9조 제1항 제1호 내지 제6호의 어느 하나에 해당하고 미리 공개가 필요한 상당한 이유가 있다고 인정되어 소속 검찰청의 장의 승인이 있는 경우(제11조 제2항 제2호) 제7조 제2호 내지 제6호의 공개금지정보");
  L.push("");
  L.push("> 본 문서는 입력된 공개 가능 사실만으로 생성한 **초안**입니다. 배포 전 담당자 검토가 필요하며, 피의자·피고인은 비식별(A씨 등) 처리되었습니다.");
  L.push("");

  // 4) 주요 내용
  L.push("## 【주요 내용】");
  L.push(`- ○ ${office}는 ${crime} 사건과 관련하여 ${suspect}을(를) ${charges} 혐의로 ${val(input.dispositionResult, stage)}한 것으로 알려졌습니다.`);
  if (input.damageScale?.trim()) L.push(`- ○ 피해 규모: ${input.damageScale.trim()} (발표 범위 기준)`);
  if (input.emphasisMessage?.trim()) L.push(`- ○ ${input.emphasisMessage.trim()}`);
  L.push("");

  // Ⅰ. 피의자 및 공소사실 요지
  L.push("## Ⅰ. 피의자(피고인) 및 공소사실 요지");
  L.push(`- ○ ${suspect} [${val(input.dispositionResult, stage)}]`);
  L.push(`- 공소사실 요지: ${val(input.caseSummary, "발표 자료 참조")} 【${charges}】`);
  if (input.victimDescription?.trim()) L.push(`- ※ 피해 관련: ${input.victimDescription.trim()} (피해자 정보는 비식별 처리)`);
  L.push("");

  // Ⅱ. 수사 경과
  L.push("## Ⅱ. 수사 경과");
  L.push(`- ○ ${val(input.investigationResult, "수사 경과는 발표된 범위 내에서 확인됩니다.")}`);
  L.push("- ※ 구체적 수사 방법·일자 등은 공개 가능한 범위에서만 기재합니다.");
  L.push("");

  // Ⅲ. 수사 결과 및 의의
  L.push("## Ⅲ. 수사 결과 및 의의");
  L.push(`- ○ 현재 ${stage} 단계로, ${suspect}은(는) ${charges} 혐의를 받고 있는 것으로 알려졌으며, 유무죄는 향후 재판 절차를 통해 가려질 예정입니다.`);
  if (input.legalKeywords && input.legalKeywords.length) L.push(`- 적용 법령(참고): ${input.legalKeywords.join(", ")}`);
  L.push("");

  // Ⅳ. 향후 계획
  L.push("## Ⅳ. 향후 계획");
  L.push(`- ○ ${val(input.futurePlan, `${office}는 법과 원칙에 따라 필요한 절차를 진행하고, 재판 진행 중인 사건은 공소유지에 만전을 기할 예정입니다.`)}`);
  L.push("");

  // 유의사항
  L.push("## 유의사항");
  L.push("- 본 자료는 입력된 사실만으로 작성된 **초안**으로, 배포 전 담당자의 사실 확인과 검토가 필요합니다.");
  L.push("- 피의자는 혐의를 받고 있는 단계이며, 유무죄는 법원의 판단으로 확정됩니다.");
  L.push("- 피의자·피해자의 개인정보 및 식별 가능 정보는 포함하지 않았습니다.");
  if (input.publicScope?.trim()) L.push(`- 공개 범위: ${input.publicScope.trim()}`);
  if (input.anonymizationRules?.trim()) L.push(`- 비식별 규칙: ${input.anonymizationRules.trim()}`);
  if (input.attachments && input.attachments.length) L.push(`- 첨부자료: ${input.attachments.join(", ")}`);
  L.push("");
  L.push("▨");

  return L.join("\n");
}

function buildReferenceAppendix(references: SelectedReference[]): string {
  if (!references.length) return "";
  const lines: string[] = ["", "## 참고한 공개 검찰발표자료 형식", "", "_아래 자료는 제목·구조·어조 등 형식 참고용이며, 본문의 사실관계는 차용하지 않았습니다._", ""];
  for (const r of references) {
    const meta = [r.titlePatternType, r.officeName].filter(Boolean).join(" · ");
    lines.push(`- ${r.title}${meta ? ` (${meta})` : ""}`);
  }
  return lines.join("\n");
}

export async function generatePressRelease(
  input: PressReleaseInput,
  references: SelectedReference[],
): Promise<GeneratedDraft> {
  const titleCandidates = buildTitleCandidates(input);
  const title = titleCandidates[0] || `${val(input.officeName, "○○지방검찰청")} 보도자료 초안`;
  const referenceAppendix = buildReferenceAppendix(references);

  let body = "";
  try {
    body = await getLlmProvider().generateReport({
      systemPrompt: PRESS_RELEASE_SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(input, references),
    });
  } catch {
    body = "";
  }
  if (!body || !body.trim()) body = buildFallbackMarkdown(input, title);

  let draftMarkdown = body.trim();
  if (referenceAppendix && !draftMarkdown.includes("참고한 공개 검찰발표자료 형식")) {
    draftMarkdown = `${draftMarkdown}\n${referenceAppendix}`;
  }
  draftMarkdown = rewriteText(draftMarkdown).text;

  const qa = input.includeQA ? generateQA(input) : [];
  const checklist = input.includeChecklist ? generateChecklist(input, draftMarkdown) : [];
  const riskCheck = input.includeRiskCheck ? checkPressRelease(draftMarkdown, input) : null;

  return {
    title,
    subtitle: input.emphasisMessage?.trim() || undefined,
    draftMarkdown,
    titleCandidates: input.includeTitleCandidates ? titleCandidates : [],
    qa,
    checklist,
    riskCheck,
    referenceNote: references,
  };
}
