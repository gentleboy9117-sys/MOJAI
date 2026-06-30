"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ISSUE_SUBNAV = [
  { label: "이슈 모니터링", href: "/issue-monitoring" },
  { label: "검찰청별 보기", href: "/offices" },
  { label: "범죄유형별 보기", href: "/crime-types" },
  { label: "제도/정책 이슈", href: "/policy-issues" },
];

/** [이슈 모니터링] 하위 탭 바 — 이슈 대시보드/검찰청별/범죄유형별/이슈 브리핑 */
export function IssueSubNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-line">
      {ISSUE_SUBNAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
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
