// =====================================================================
// 수동 입력 집회·시위 공개일정 Provider
//  * 담당자가 공개자료를 직접 등록할 때 사용한다.
//  * 입력값은 '공개 일정 정보' 범위로 한정한다(참가자 식별/성향 추론 금지).
// =====================================================================
import {
  type RawAssembly,
  assemblyContentHash,
} from "./AssemblyScheduleProvider";

export type ManualAssemblyInput = Partial<Omit<RawAssembly, "eventDate">> & {
  /** 집회 예정일 (Date 또는 YYYY-MM-DD 문자열) */
  eventDate: Date | string;
};

export class ManualAssemblyInputProvider {
  readonly name = "ManualAssemblyInputProvider";

  /** 부분 입력값을 RawAssembly 로 정규화한다(해시 자동 계산). */
  fromInput(partial: ManualAssemblyInput): RawAssembly {
    const eventDate =
      partial.eventDate instanceof Date
        ? partial.eventDate
        : new Date(partial.eventDate);
    const sourceUrl = partial.sourceUrl;
    return {
      eventDate,
      startTime: partial.startTime,
      endTime: partial.endTime,
      title: partial.title || "공개 집회·시위 일정(수동 등록)",
      locationName: partial.locationName || "",
      address: partial.address,
      district: partial.district,
      policeStationName: partial.policeStationName,
      organizerName: partial.organizerName,
      expectedParticipants: partial.expectedParticipants,
      marchRoute: partial.marchRoute,
      topicSummary: partial.topicSummary,
      sourceName: partial.sourceName || "수동 입력",
      sourceUrl,
      sourcePostTitle: partial.sourcePostTitle,
      sourcePublishedAt: partial.sourcePublishedAt,
      rawText: partial.rawText,
      attachmentUrls: partial.attachmentUrls ?? [],
      contentHash:
        partial.contentHash ||
        assemblyContentHash({
          eventDate,
          startTime: partial.startTime,
          locationName: partial.locationName,
          organizerName: partial.organizerName,
          sourceUrl,
        }),
    };
  }
}
