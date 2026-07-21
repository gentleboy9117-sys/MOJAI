// 앱 기준 '오늘' — 제출 스냅샷용으로 고정 가능.
//  우선순위: 환경변수 NEXT_PUBLIC_APP_TODAY > 하드코딩 FROZEN.
//  실시간 날짜로 되돌리려면 FROZEN 을 "" 로 두고 환경변수도 비우면 new Date() 사용.
const FROZEN = "2026-07-21"; // 제출 기준일(최신 수집일). 실시간으로 바꾸려면 "" 로.

export function appToday(): Date {
  const s = process.env.NEXT_PUBLIC_APP_TODAY || FROZEN;
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  return new Date();
}
