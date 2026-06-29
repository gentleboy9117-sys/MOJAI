"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, ListTree, Landmark, FileText, Gavel,
  Megaphone, CalendarDays, Newspaper, Vote, HardHat, FilePenLine,
  BookOpen, ShieldAlert, ScrollText, Settings, Circle, type LucideIcon,
} from "lucide-react";
import { NAV_GROUPS } from "@/lib/client/labels";
import { cn } from "@/lib/utils";

// 항목별 아이콘(KRDS 아이콘 톤 — 비활성 ink-disabled, 활성 흰색)
const ICONS: Record<string, LucideIcon> = {
  "/": LayoutDashboard,
  "/offices": Building2,
  "/crime-types": ListTree,
  "/policy-issues": Landmark,
  "/reports": FileText,
  "/trials/offices": Building2,
  "/trials/crime-types": Gavel,
  "/trials/reports": FileText,
  "/public-safety": Megaphone,
  "/public-safety/assemblies": CalendarDays,
  "/public-safety/related-news": Newspaper,
  "/public-safety/election-news": Vote,
  "/public-safety/labor-news": HardHat,
  "/public-safety/briefings": FileText,
  "/press-release-generator": FilePenLine,
  "/press-release-references": BookOpen,
  "/risk-checker": ShieldAlert,
  "/audit-logs": ScrollText,
  "/settings": Settings,
};

export function SideNav({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const path = usePathname();
  // 현재 경로에 가장 길게(구체적으로) 일치하는 메뉴 1개만 활성화
  const bestMatch = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href))
    .filter((h) => path === h || path.startsWith(h + "/"))
    .sort((a, b) => b.length - a.length)[0];
  return (
    <>
      {/* 모바일 드로어 배경(클릭 시 닫힘) */}
      {open && <div onClick={onClose} className="fixed inset-0 z-30 bg-black/40 md:hidden" aria-hidden />}
      <nav
        className={cn(
          "z-40 flex w-56 shrink-0 flex-col overflow-y-auto border-r border-line bg-white px-3 py-4 scrollbar-thin",
          "fixed inset-y-0 left-0 transform transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {NAV_GROUPS.map((g, gi) => (
          <div
            key={g.title || "_top"}
            className={cn(gi > 0 && "mt-3 border-t border-line pt-3")}
          >
            {g.title && (
              <p className="px-2 pb-1 text-caption font-semibold uppercase tracking-wider text-ink-disabled">
                {g.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = it.href === bestMatch;
                const Icon = ICONS[it.href] ?? Circle;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-body-s transition-colors",
                        active ? "bg-primary font-medium text-white" : "text-ink-body hover:bg-gray-5",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-ink-disabled")} />
                      <span className="truncate">{it.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}
