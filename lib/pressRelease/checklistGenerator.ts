// =====================================================================
// 배포 전 체크리스트 생성기 (사양 6-12)
//  * 공개 가능 사실만 / 피의자·피해자 구분 / 유죄 단정 없음 /
//    개인정보 없음 / 수사기밀 없음 / 수치·일자 근거 / 참고 출처 표시 /
//    담당자 검토 문구
//  * checked 는 draftMarkdown 에서 best-effort 자동 탐지.
// =====================================================================
import type { PressReleaseInput } from "./types";

const PII_PATTERNS = [
  /\d{6}[-\s]?[1-4]\d{6}/, // 주민등록번호
  /01[016-9][-\s]?\d{3,4}[-\s]?\d{4}/, // 휴대전화
  /피해자\s?[가-힣]{2,4}(씨|군|양)/, // 피해자 실명형
];

// 유죄/피의사실 단정 표현(완화 전이면 남아있을 수 있음)
const GUILT_PATTERNS = [
  /편취했다/,
  /횡령했다/,
  /배임했다/,
  /범행을 저질렀다/,
  /범죄자(이다|입니다)/,
  /주범(이다|입니다)/,
];

/**
 * 배포 전 체크리스트 생성. checked 는 초안 본문 기반 best-effort 자동 판정이며,
 * 최종 확인은 담당자 책임이다.
 */
export function generateChecklist(
  input: PressReleaseInput,
  draftMarkdown: string
): { item: string; checked: boolean }[] {
  const md = draftMarkdown || "";

  const hasPII = PII_PATTERNS.some((re) => re.test(md));
  const hasGuilt = GUILT_PATTERNS.some((re) => re.test(md));
  const usesHedging = /(혐의를 받고|보도에 따르면|공식 발표에 따르면|알려졌다)/.test(md);
  const hasSuspectVictimDistinction =
    /피의자/.test(md) && (/피해자/.test(md) || !!input.victimDescription?.trim());
  const hasReviewerNotice = /(담당자 검토|초안|검토 필요)/.test(md);
  const hasReferenceNote = /(참고한|참고 출처|참고 자료|레퍼런스|형식)/.test(md);
  const hasNumbersBasis =
    !/[0-9○]+\s*(억|만|천)?\s*원/.test(md) || // 금액 표기가 없거나
    !!input.damageScale?.trim() || // 입력 근거가 있거나
    !!input.investigationResult?.trim();

  return [
    {
      item: "공개 가능한 사실만 포함했는가 (수사 비공개 사항 미포함)",
      checked: !/(수사기밀|비공개|대외비)/.test(md),
    },
    {
      item: "피의자와 피해자를 명확히 구분했는가",
      checked: hasSuspectVictimDistinction,
    },
    {
      item: "유죄를 단정하는 표현이 없는가 ('혐의를 받고 있다' 등 사용)",
      checked: !hasGuilt && usesHedging,
    },
    {
      item: "개인정보(실명·주민번호·연락처 등)가 포함되지 않았는가",
      checked: !hasPII,
    },
    {
      item: "수사기밀·미공개 수사기법이 노출되지 않았는가",
      checked: !/(수사기법|압수수색 일정|내사|첩보 출처)/.test(md),
    },
    {
      item: "수치·일자 등에 입력 근거가 있는가 (임의 생성 아님)",
      checked: hasNumbersBasis,
    },
    {
      item: "참고한 발표자료 형식 출처를 표시했는가",
      checked: hasReferenceNote,
    },
    {
      item: "'초안 — 담당자 검토 필요' 고지 문구가 포함되었는가",
      checked: hasReviewerNotice,
    },
  ];
}
