// Netlify 빌드 시에만 Prisma provider 를 sqlite → postgresql 로 전환(로컬은 그대로 sqlite).
//  package.json 의 "prebuild" 에서 실행됨. Netlify 환경변수 NETLIFY=true 로 감지.
import { readFileSync, writeFileSync } from "node:fs";

const onNetlify = process.env.NETLIFY === "true" || process.env.NETLIFY === "1";
if (!onNetlify) {
  console.log("[netlify-prisma] 로컬 빌드 — provider 변경 없음(sqlite 유지)");
  process.exit(0);
}

const path = "prisma/schema.prisma";
let s = readFileSync(path, "utf8");
if (s.includes('provider = "sqlite"')) {
  s = s.replace('provider = "sqlite"', 'provider = "postgresql"');
  writeFileSync(path, s);
  console.log("[netlify-prisma] provider sqlite → postgresql 전환 완료(Netlify 빌드)");
} else {
  console.log("[netlify-prisma] 이미 postgresql 이거나 sqlite 미발견 — 변경 없음");
}
