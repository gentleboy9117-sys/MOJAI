// =====================================================================
// LLM Provider 팩토리 — env(LLM_PROVIDER)로 mock|openai|local 선택.
// 운영 모드에서는 internal/local 또는 승인된 전용망 LLM 으로 교체.
// =====================================================================
import type { LlmProvider } from "./types";
import { MockLLMProvider } from "./MockLLMProvider";
import { createOpenAIProvider } from "./OpenAIProvider";
import { createLocalLLMProvider } from "./LocalLLMProvider";

export * from "./types";

let cached: LlmProvider | null = null;

export function getLlmProvider(): LlmProvider {
  if (cached) return cached;
  const mode = (process.env.LLM_PROVIDER || "mock").toLowerCase();
  switch (mode) {
    case "openai":
      // 키가 없으면 안전하게 mock 으로 폴백
      cached = process.env.OPENAI_API_KEY ? createOpenAIProvider() : new MockLLMProvider();
      break;
    case "local":
      cached = createLocalLLMProvider();
      break;
    default:
      cached = new MockLLMProvider();
  }
  return cached;
}

/** 테스트/스크립트에서 강제 교체 */
export function setLlmProvider(p: LlmProvider) {
  cached = p;
}
