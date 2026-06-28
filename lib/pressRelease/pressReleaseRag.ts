// =====================================================================
// 보도자료 스타일 RAG — 레퍼런스 선정
//  * 입력의 발표유형/범죄유형/검찰청 기준으로 스타일이 가까운 레퍼런스 top-k 선정.
//  * 절대 레퍼런스 본문(사실)을 반환하지 않는다 — 스타일 메타데이터만.
// =====================================================================
import type { PressReleaseInput, SelectedReference } from "./types";
import { releaseTypeLabel } from "./types";
import { classifyTitlePattern } from "./titlePatternAnalyzer";

interface RefRow {
  id: string;
  title: string;
  titlePatternType?: string | null;
  officeName?: string | null;
  sourceUrl?: string | null;
  crimeType?: string | null;
}

/** releaseType key/label → 제목 패턴 type 매핑 */
function expectedTitlePattern(input: PressReleaseInput): string {
  const label = releaseTypeLabel(input.releaseType);
  // RELEASE_TYPES 라벨 ↔ 제목 패턴 type 정합
  const map: Record<string, string> = {
    "성과 발표형": "성과 발표형",
    "수사 결과 발표형": "수사 결과 발표형",
    "합동수사·TF 출범형": "합동수사 출범형",
    "우수사례 선정형": "우수사례 선정형",
    "정책 대응형": "정책 대응형",
    "범죄 근절 캠페인형": "범죄 근절 캠페인형",
    "제도 개선형": "제도 개선형",
    "국제공조·협력형": "국제공조형",
  };
  return map[label] || "수사 결과 발표형";
}

function refPatternType(r: RefRow): string {
  if (r.titlePatternType && r.titlePatternType.trim()) return r.titlePatternType.trim();
  return classifyTitlePattern(r.title || "").type;
}

/**
 * 스타일이 가까운 레퍼런스 top-k 선정.
 * 점수: 제목패턴 일치(0.5) + 범죄유형 제목 포함(0.3) + 검찰청 일치(0.2).
 */
export function selectReferences(
  input: PressReleaseInput,
  refs: RefRow[],
  k = 3
): SelectedReference[] {
  const wantPattern = expectedTitlePattern(input);
  const crime = (input.crimeType || "").trim();
  const office = (input.officeName || "").trim();

  const scored = refs.map((r) => {
    const reasons: string[] = [];
    let score = 0;

    const rPattern = refPatternType(r);
    if (rPattern === wantPattern) {
      score += 0.5;
      reasons.push(`발표 유형(${wantPattern}) 형식 일치`);
    }

    if (crime && r.title && r.title.includes(crime)) {
      score += 0.3;
      reasons.push(`범죄 유형(${crime}) 제목 포함`);
    } else if (crime && r.crimeType && r.crimeType.includes(crime)) {
      score += 0.2;
      reasons.push(`범죄 유형(${crime}) 분류 일치`);
    }

    if (office && r.officeName && r.officeName === office) {
      score += 0.2;
      reasons.push("발표 주체 검찰청 일치");
    } else if (office && r.officeName && r.officeName.includes(office.slice(0, 4))) {
      score += 0.1;
      reasons.push("발표 주체 검찰청 유사");
    }

    // 동률 안정 정렬용 미세 가산(제목 길이)
    const similarity = Math.min(1, score);
    return {
      ref: r,
      pattern: rPattern,
      similarity,
      matchReason: reasons.length ? reasons.join(", ") : "제목 형식 참고용",
    };
  });

  scored.sort((a, b) => b.similarity - a.similarity);

  return scored.slice(0, Math.max(0, k)).map((s) => ({
    id: s.ref.id,
    title: s.ref.title,
    titlePatternType: s.pattern,
    officeName: s.ref.officeName || undefined,
    sourceUrl: s.ref.sourceUrl ?? undefined,
    similarity: Number(s.similarity.toFixed(2)),
    matchReason: s.matchReason,
  }));
}
