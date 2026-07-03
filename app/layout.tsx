import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { PrefetchSnapshots } from "@/components/PrefetchSnapshots";

export const metadata: Metadata = {
  title: "AI 기반 검찰 기획업무 자동화 플랫폼",
  description: "기획검사 AI 업무지원 — 오전 이슈 모니터링·브리핑 + 사건 처리 후 검찰발표자료 초안 생성",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AppShell>
          <Suspense fallback={null}>{children}</Suspense>
        </AppShell>
        <PrefetchSnapshots />
      </body>
    </html>
  );
}
