// Netlify Scheduled Function — 자동 수집.
//  ⚠️ 제출 스냅샷 고정을 위해 현재 '비활성화'(신규 기사 크롤링 중단) 상태.
//  다시 켜려면 아래 runAutoCollect 호출 주석을 해제하고 export const config 의 schedule 을 살린다.
// import { runAutoCollect } from "../../scripts/auto-collect";

export default async () => {
  // 제출용 데이터 고정: 자동 수집 중단(no-op)
  return new Response(JSON.stringify({ disabled: true, reason: "submission snapshot — auto-collect paused" }), {
    headers: { "content-type": "application/json" },
  });
};

// 스케줄 비활성화(실행 안 함). 재가동 시 "0 */6 * * *" 등으로 설정.
export const config = {};
