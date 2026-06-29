"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TRIAL_SUBNAV = [
  { label: "검찰청별 보기", href: "/trials/offices" },
  { label: "범죄유형별 보기", href: "/trials/crime-types" },
  { label: "공판 브리핑", href: "/trials/reports" },
];

/** [공판 모니터링] 하위 탭 바 — 공판 모니터링/검찰청별/범죄유형별/공판 브리핑 */
export function TrialSubNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-line">
      {TRIAL_SUBNAV.map((item) => {
        const active =
          item.href === "/trials"
            ? pathname === "/trials"
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
