"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "@/lib/client/labels";
import { cn } from "@/lib/utils";

export function SideNav({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const path = usePathname();
  // 현재 경로에 가장 길게(구체적으로) 일치하는 메뉴 1개만 활성화
  //  (예: /trials/offices 에서는 '검찰청별 보기'만, 상위 '공판 모니터링'은 비활성)
  const bestMatch = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href))
    .filter((h) => path === h || path.startsWith(h + "/"))
    .sort((a, b) => b.length - a.length)[0];
  return (
    <>
      {/* 모바일 드로어 배경(클릭 시 닫힘) */}
      {open && <div onClick={onClose} className="fixed inset-0 z-30 bg-black/40 md:hidden" aria-hidden />}
      <nav
        className={cn(
          "z-40 flex w-56 shrink-0 flex-col gap-5 overflow-y-auto border-r border-line bg-white px-3 py-5 scrollbar-thin",
          // 모바일: 화면 밖에서 슬라이드인 드로어 / 데스크톱(md+): 고정 사이드바
          "fixed inset-y-0 left-0 transform transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {NAV_GROUPS.map((g) => (
          <div key={g.title || "_top"}>
            {g.title && (
              <p className="px-2 pb-1.5 text-detail font-semibold tracking-wide text-ink-disabled">{g.title}</p>
            )}
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = it.href === bestMatch;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      onClick={onClose}
                      className={cn(
                        "block rounded-md px-3 py-2 text-body-s transition-colors",
                        active ? "bg-primary font-medium text-white" : "text-ink-body hover:bg-gray-5",
                      )}
                    >
                      {it.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <p className="mt-auto px-2 text-detail leading-relaxed text-ink-disabled">
          공개 자료 기반 참고 시스템 · 모든 AI 결과는 초안/참고용
        </p>
      </nav>
    </>
  );
}
