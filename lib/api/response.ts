import { NextResponse } from "next/server";
import type { ApiResponse } from "@/lib/types";

/** 표준 성공 응답 */
export function ok<T>(data: T, meta?: Record<string, unknown>, status = 200) {
  return NextResponse.json<ApiResponse<T>>({ ok: true, data, meta }, { status });
}

/** 표준 에러 응답 */
export function fail(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json<ApiResponse<never>>(
    { ok: false, error: { code, message, details } },
    { status },
  );
}

/** 라우트 핸들러 공통 try/catch 래퍼 — 크롤링/DB 오류로 앱이 죽지 않게 */
export async function handle<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    console.error("[API ERROR]", message, e);
    return fail("INTERNAL_ERROR", message, 500);
  }
}

export const ERROR = {
  UNAUTHORIZED: ["UNAUTHORIZED", "인증이 필요합니다.", 401] as const,
  FORBIDDEN: ["FORBIDDEN", "권한이 없습니다.", 403] as const,
  NOT_FOUND: ["NOT_FOUND", "대상을 찾을 수 없습니다.", 404] as const,
  BAD_REQUEST: ["BAD_REQUEST", "잘못된 요청입니다.", 400] as const,
  RATE_LIMITED: ["RATE_LIMITED", "요청이 너무 많습니다.", 429] as const,
};
