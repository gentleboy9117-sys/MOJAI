// Netlify Scheduled Function — 6시간마다 자동 수집(로컬 Windows 작업 스케줄러 대체).
//  로직은 scripts/auto-collect.ts 의 runAutoCollect() 를 그대로 재사용.
import { runAutoCollect } from "../../scripts/auto-collect";

export default async () => {
  try {
    const result = await runAutoCollect();
    return new Response(JSON.stringify(result), { headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(`auto-collect 실패: ${String(e)}`, { status: 500 });
  }
};

// UTC 기준 cron. "0 */6 * * *" = 6시간마다.
export const config = { schedule: "0 */6 * * *" };
