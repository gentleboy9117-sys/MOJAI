"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { getDevUser, type DevUser } from "@/lib/client/api";

const ROLE_LABEL: Record<DevUser["role"], string> = { VIEWER: "사용자", ANALYST: "분석관", ADMIN: "관리자" };

export function UserChip() {
  const [u, setU] = useState<DevUser | null>(null);
  useEffect(() => {
    const f = () => setU(getDevUser());
    f();
    window.addEventListener("piaw-user-changed", f);
    return () => window.removeEventListener("piaw-user-changed", f);
  }, []);
  if (!u) return null;
  return (
    <Link href="/settings" className="flex items-center gap-1.5 rounded-md border border-line py-1.5 pl-2 pr-2.5 hover:bg-gray-5" title="권한 전환(설정)">
      <UserRound className="h-4 w-4 text-ink-muted" />
      <span className="rounded-sm bg-navy-5 px-1.5 py-0.5 text-detail font-medium text-navy-60">{ROLE_LABEL[u.role]}</span>
    </Link>
  );
}
