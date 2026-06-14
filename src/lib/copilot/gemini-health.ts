import { checkOpenLlmHealth } from "@/lib/llm/open-llm";

export type LlmHealthStatus = Awaited<ReturnType<typeof checkOpenLlmHealth>>;

export async function checkLlmHealth(): Promise<LlmHealthStatus> {
  return checkOpenLlmHealth();
}

/** @deprecated */
export const checkGeminiHealth = checkLlmHealth;

export function isQuotaErrorMessage(_message: string): boolean {
  return false;
}
