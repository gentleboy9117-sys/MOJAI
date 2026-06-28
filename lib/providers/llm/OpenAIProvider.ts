import { createOpenAICompatibleProvider } from "./openai-compatible";
import type { LlmProvider } from "./types";

/** OpenAI(또는 OpenAI 호환 게이트웨이) */
export function createOpenAIProvider(): LlmProvider {
  return createOpenAICompatibleProvider({
    name: "openai",
    baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  });
}
