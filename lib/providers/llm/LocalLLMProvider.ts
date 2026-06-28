import { createOpenAICompatibleProvider } from "./openai-compatible";
import type { LlmProvider } from "./types";

/**
 * 내부망 설치형 LLM (OpenAI 호환 엔드포인트: vLLM/Ollama/사내 게이트웨이).
 * 운영 환경에서 외부 전송 없이 동작하도록 분리한다.
 */
export function createLocalLLMProvider(): LlmProvider {
  return createOpenAICompatibleProvider({
    name: "local",
    baseUrl: process.env.LOCAL_LLM_BASE_URL || "http://localhost:11434/v1",
    apiKey: process.env.LOCAL_LLM_API_KEY,
    model: process.env.LOCAL_LLM_MODEL || "qwen2.5",
  });
}
