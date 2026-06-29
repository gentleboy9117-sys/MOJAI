"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { NAV_GROUPS } from "@/lib/client/labels";
import { cn } from "@/lib/utils";

export function SideNav({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const path = usePathname();
  // 현재 경로에 가장 길게(구체적으로) 일치하는 메뉴 1개만 활성화
  const bestMatch = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href))
    .filter((h) => path === h || path.startsWith(h + "/"))
    .sort((a, b) => b.length - a.length)[0];
  // 현재 활성 항목이 속한 그룹
  const activeGroup = NAV_GROUPS.find((g) => g.items.some((i) => i.href === bestMatch))?.title;

  // 그룹 접기/펼치기 — 기본은 활성 그룹만 펼침
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(activeGroup ? [activeGroup] : []));
  // 다른 메뉴로 이동하면 해당 그룹은 자동으로 펼침
  useEffect(() => {
    if (activeGroup) setOpenGroups((p) => (p.has(activeGroup) ? p : new Set(p).add(activeGroup)));
  }, [activeGroup]);
  const toggle = (t: string) =>
    setOpenGroups((p) => {
      const n = new Set(p);
      n.has(t) ? n.delete(t) : n.add(t);
      return n;
    });

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
        {NAV_GROUPS.map((g, gi) => {
          const collapsible = !!g.title;
          const isOpen = !collapsible || openGroups.has(g.title);
          return (
            <div key={g.title || "_top"} className={cn(gi > 0 && "mt-2 border-t border-line pt-2")}>
              {collapsible && (
                <button
                  onClick={() => toggle(g.title)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-caption font-semibold uppercase tracking-wider text-ink-disabled transition-colors hover:text-ink-muted"
                >
                  <span>{g.title}</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen ? "" : "-rotate-90")} />
                </button>
              )}
              {isOpen && (
                <ul className="space-y-0.5">
                  {g.items.map((it) => {
                    const active = it.href === bestMatch;
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
                          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-[2px]", active ? "bg-white" : "bg-ink-disabled")} />
                          <span className="truncate">{it.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </>
  );
}
