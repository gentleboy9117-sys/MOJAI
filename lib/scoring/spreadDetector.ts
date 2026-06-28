// =====================================================================
// 이슈 확산 단계 감지
//   신규(NEW) → 관찰 중(OBSERVING) → 확산 중(SPREADING) → 고확산(HIGH_SPREAD) → 안정(STABLE)
// =====================================================================
export type SpreadStatus = "NEW" | "OBSERVING" | "SPREADING" | "HIGH_SPREAD" | "STABLE";

export const SPREAD_LABEL: Record<SpreadStatus, string> = {
  NEW: "신규",
  OBSERVING: "관찰 중",
  SPREADING: "확산 중",
  HIGH_SPREAD: "고확산",
  STABLE: "안정",
};

export interface SpreadInput {
  articleCount: number;
  sourceCount: number;
  hoursSinceFirst: number;
  recent24hCount: number;
  hasOfficialPress: boolean;
}

export function detectSpread(input: SpreadInput): SpreadStatus {
  const { articleCount, sourceCount, hoursSinceFirst, recent24hCount } = input;

  if (articleCount <= 1) return "NEW";
  if (recent24hCount >= 4 && sourceCount >= 4) return "HIGH_SPREAD";
  if (recent24hCount >= 2 || sourceCount >= 3) return "SPREADING";
  // 최초 보도 후 3일 경과 + 최근 후속 없음 → 안정
  if (hoursSinceFirst > 72 && recent24hCount === 0) return "STABLE";
  return "OBSERVING";
}

export function spreadDescription(input: SpreadInput): string {
  const status = detectSpread(input);
  return `${SPREAD_LABEL[status]} · 보도 ${input.articleCount}건 · 출처 ${input.sourceCount}개 · 최근 24시간 +${input.recent24hCount}건`;
}
