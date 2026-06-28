// =====================================================================
// HTML sanitize — 수집/표시 전 원문 HTML 정화 (XSS/스크립트 차단)
// =====================================================================
import sanitizeHtmlLib from "sanitize-html";

const ALLOWED_TAGS = [
  "p", "br", "b", "strong", "i", "em", "u", "s", "blockquote",
  "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
  "table", "thead", "tbody", "tr", "th", "td", "a", "span", "div", "hr", "pre", "code",
];

/** 표시용 안전 HTML */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return "";
  return sanitizeHtmlLib(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      // 외부 링크 안전화
      a: sanitizeHtmlLib.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
      // 스크립트/이미지 등 위험 요소는 allowedTags 미포함으로 자동 제거
    },
    disallowedTagsMode: "discard",
  });
}

/** 본문 텍스트만 추출(요약/분류 입력용) */
export function htmlToText(dirty: string | null | undefined): string {
  if (!dirty) return "";
  const text = sanitizeHtmlLib(dirty, { allowedTags: [], allowedAttributes: {} });
  return text.replace(/\s+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
}
