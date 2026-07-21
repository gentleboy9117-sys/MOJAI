"use client";
import { useState } from "react";
import { Masthead } from "./Masthead";
import { Header } from "./Header";
import { SideNav } from "./SideNav";
import { BackButton } from "./BackButton";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  return (
    <div className="flex h-screen flex-col">
      <Masthead />
      <Header onMenu={() => setNavOpen(true)} />
      <div className="flex min-h-0 flex-1">
        <SideNav open={navOpen} onClose={() => setNavOpen(false)} />
        <main className="min-w-0 flex-1 overflow-y-auto bg-surface scrollbar-thin">{children}</main>
      </div>
      {/* 전역 '이전 화면' — 좌하단 플로팅 */}
      <BackButton />
    </div>
  );
}
