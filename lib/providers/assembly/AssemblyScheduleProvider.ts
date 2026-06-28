// =====================================================================
// [공안] 집회·시위 공개일정 수집 Provider 인터페이스
//  * 집회·시위는 헌법상 기본권 행사일 수 있으므로 범죄로 단정하지 않는다.
//  * 여기서 다루는 것은 '공개 일정 정보' 뿐이다(참가자/성향 정보 수집 금지).
// =====================================================================

/** 수집된 원시(raw) 집회·시위 공개일정 — 저장 전 정규화 표현 */
export interface RawAssembly {
  /** 집회 예정일 */
  eventDate: Date;
  startTime?: string;
  endTime?: string;
  /** 공개자료에 명시된 일정 제목 */
  title: string;
  /** 장소명(공개자료 표기) */
  locationName: string;
  /** 주소(있는 경우, 예: 서울 종로구 …) */
  address?: string;
  /** 행정구(예: 종로구) */
  district?: string;
  /** 관할 경찰서명(공개자료 표기) */
  policeStationName?: string;
  /** 주최(공개자료에 명시된 경우만; 일반 명칭) */
  organizerName?: string;
  /** 예상 인원(공개자료에 명시된 경우만, 예: 약 100명) */
  expectedParticipants?: string;
  /** 행진 경로(공개자료에 명시된 경우만) */
  marchRoute?: string;
  /** 공개자료 명시 범위 내 주제 요약(성향/배후 추론 금지) */
  topicSummary?: string;
  /** 출처 기관명(예: 서울경찰청) */
  sourceName: string;
  /** 출처 URL */
  sourceUrl?: string;
  /** 출처 게시글 제목 */
  sourcePostTitle?: string;
  /** 출처 게시 일시 */
  sourcePublishedAt?: Date;
  /** 원문 텍스트(공개 범위) */
  rawText?: string;
  /** 첨부 파일 URL 목록 */
  attachmentUrls?: string[];
  /** 중복 제거용 콘텐츠 해시 */
  contentHash: string;
}

/** 집회·시위 공개일정 수집기 공통 인터페이스 */
export interface AssemblyScheduleProvider {
  readonly name: string;
  /** 공개일정 수집 — 실패해도 throw 하지 않고 [] 를 반환하도록 구현한다. */
  collect(): Promise<RawAssembly[]>;
}

/**
 * 결정적 단순 해시 — 동일 일정의 중복 저장 방지용.
 *  eventDate(ISO date) + startTime + locationName + organizerName + sourceUrl 조합.
 */
export function assemblyContentHash(parts: {
  eventDate: Date | string;
  startTime?: string;
  locationName?: string;
  organizerName?: string;
  sourceUrl?: string;
}): string {
  const dateStr =
    parts.eventDate instanceof Date
      ? parts.eventDate.toISOString().slice(0, 10)
      : String(parts.eventDate).slice(0, 10);
  const input = [
    dateStr,
    parts.startTime ?? "",
    parts.locationName ?? "",
    parts.organizerName ?? "",
    parts.sourceUrl ?? "",
  ].join("|");

  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return `asm_${(h >>> 0).toString(36)}`;
}
