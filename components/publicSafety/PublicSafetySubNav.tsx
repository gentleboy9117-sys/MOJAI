"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PUBLIC_SAFETY_SUBNAV } from "./publicSafetyLabels";

/** [공안] 모듈 하위 탭 바 — 대시보드/공개일정/관련 보도/관할별/브리핑 */
export function PublicSafetySubNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-line">
      {PUBLIC_SAFETY_SUBNAV.map((item) => {
        const active =
          item.href === "/public-safety"
            ? pathname === "/public-safety"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-body-s transition-colors",
              active
                ? "border-primary font-bold text-primary"
                : "border-transparent text-ink-muted hover:text-ink-title",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
