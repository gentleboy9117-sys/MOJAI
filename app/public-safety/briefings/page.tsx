import { redirect } from "next/navigation";

// 브리핑은 [공보 > 브리핑]으로 통합됨 — 구 경로는 통합 화면으로 이동
export default function BriefingsPage() {
  redirect("/reports");
}
