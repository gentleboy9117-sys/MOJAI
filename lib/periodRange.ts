// 달력 기준 기간(오늘/금주/금월) + 동기간 대비(전일/전주/전월) 범위 계산.
//  서버·클라이언트 공용. 기준 '오늘'은 appToday()(제출 스냅샷 고정일).
import { appToday } from "./appToday";

export type CalPeriod = "today" | "week" | "month";

export interface PeriodRange {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  periodLabel: string; // 오늘 / 금주 / 금월
  deltaLabel: string; // 전일 대비 / 전주 대비 / 전월 대비
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

export function calendarRange(period: CalPeriod, ref: Date = appToday()): PeriodRange {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const d = ref.getDate();

  if (period === "today") {
    return {
      start: startOfDay(ref),
      end: endOfDay(ref),
      prevStart: startOfDay(new Date(y, m, d - 1)),
      prevEnd: endOfDay(new Date(y, m, d - 1)),
      periodLabel: "금일",
      deltaLabel: "전일 대비",
    };
  }

  if (period === "week") {
    const dow = (ref.getDay() + 6) % 7; // 월=0
    return {
      start: startOfDay(new Date(y, m, d - dow)),
      end: endOfDay(ref),
      // 전주 동기간(지난주 같은 요일까지)
      prevStart: startOfDay(new Date(y, m, d - dow - 7)),
      prevEnd: endOfDay(new Date(y, m, d - 7)),
      periodLabel: "금주",
      deltaLabel: "전주 대비",
    };
  }

  // month
  const daysInPrevMonth = new Date(y, m, 0).getDate();
  const prevDay = Math.min(d, daysInPrevMonth);
  return {
    start: startOfDay(new Date(y, m, 1)),
    end: endOfDay(ref),
    // 전월 동기간(지난달 같은 일자까지)
    prevStart: startOfDay(new Date(y, m - 1, 1)),
    prevEnd: endOfDay(new Date(y, m - 1, prevDay)),
    periodLabel: "금월",
    deltaLabel: "전월 대비",
  };
}

export const PERIOD_LABEL: Record<CalPeriod, string> = { today: "오늘", week: "금주", month: "금월" };
export const DELTA_LABEL: Record<CalPeriod, string> = { today: "전일 대비", week: "전주 대비", month: "전월 대비" };
