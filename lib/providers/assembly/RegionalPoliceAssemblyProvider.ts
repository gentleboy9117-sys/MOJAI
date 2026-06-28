// =====================================================================
// 전국 지방청 집회·시위 공개일정 Provider (향후 확장용 stub)
//  * 현재 MVP 는 서울경찰청 공개자료만 다룬다.
//  * 전국 확장 시 각 지방경찰청 공개 게시판 수집기를 여기에 구현한다.
//  * 집회·시위는 헌법상 기본권 행사일 수 있으므로 범죄로 단정하지 않으며,
//    참가자 식별/성향/배후 추론은 일절 하지 않는다.
// =====================================================================
import type { AssemblyScheduleProvider, RawAssembly } from "./AssemblyScheduleProvider";

export class RegionalPoliceAssemblyProvider implements AssemblyScheduleProvider {
  readonly name = "RegionalPoliceAssemblyProvider";

  /** 향후 전국 지방청 공개자료 수집 위치. 현재는 항상 [] 를 반환한다. */
  async collect(): Promise<RawAssembly[]> {
    // TODO(확장): 지방경찰청별 공개 게시판 → 공개 일정 수집(참가자 정보 제외).
    return [];
  }
}
