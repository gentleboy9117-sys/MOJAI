// 정적 스냅샷 파일명 — URL을 결정적 해시로 변환(클라이언트/생성 스크립트 공용).
//  데이터가 고정(수집 중단) 상태이므로, 주요 API 응답을 /public/_snap 에 미리 저장해
//  CDN에서 즉시 제공한다. 스냅샷이 없으면 useApi 가 라이브 API 로 자동 폴백한다.
export function snapName(url: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < url.length; i++) {
    h ^= url.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return "s" + (h >>> 0).toString(36) + ".json";
}

export const SNAP_DIR = "/_snap";
// 스냅샷을 다시 생성할 때마다 올려 캐시를 무효화(브라우저가 옛 데이터를 재사용하지 않도록).
export const SNAP_VERSION = "2026-07-29k";
