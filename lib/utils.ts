import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind 클래스 병합 유틸 (shadcn 관용) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** YYYY-MM-DD */
export function formatDate(d?: Date | string | null): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "-";
  return date.toISOString().slice(0, 10);
}

/** YYYY-MM-DD HH:mm */
export function formatDateTime(d?: Date | string | null): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "-";
  const iso = new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString(); // KST 표시
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

/** "3일 전" 형태 상대 시간 */
export function timeAgo(d?: Date | string | null): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "-";
  const diff = Date.now() - date.getTime();
  const day = Math.floor(diff / 86400000);
  if (day > 0) return `${day}일 전`;
  const hour = Math.floor(diff / 3600000);
  if (hour > 0) return `${hour}시간 전`;
  const min = Math.floor(diff / 60000);
  if (min > 0) return `${min}분 전`;
  return "방금 전";
}

/** 안전 JSON 파싱(Prisma Json 필드용) */
export function asArray<T = string>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}
