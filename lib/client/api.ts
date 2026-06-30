"use client";
// 클라이언트 API 헬퍼 — 데모 사용자(헤더 기반 권한). 운영은 SSO 로 교체.

export interface DevUser {
  email: string;
  name: string;
  role: "VIEWER" | "ANALYST" | "ADMIN";
}

export const DEV_USERS: DevUser[] = [
  { email: "viewer@example.go.kr", name: "사용자", role: "VIEWER" },
  { email: "admin@example.go.kr", name: "관리자", role: "ADMIN" },
];

const KEY = "piaw_user";

export function getDevUser(): DevUser {
  if (typeof window === "undefined") return DEV_USERS[1];
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEV_USERS[1]; // 기본: 관리자
}

export function setDevUser(u: DevUser) {
  localStorage.setItem(KEY, JSON.stringify(u));
  window.dispatchEvent(new Event("piaw-user-changed"));
}

function headers(): HeadersInit {
  const u = getDevUser();
  return { "Content-Type": "application/json", "x-user-email": u.email, "x-user-role": u.role };
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: headers(), cache: "no-store" });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message || "요청에 실패했습니다.");
  return json.data as T;
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: headers(), body: JSON.stringify(body ?? {}) });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message || "요청에 실패했습니다.");
  return json.data as T;
}
