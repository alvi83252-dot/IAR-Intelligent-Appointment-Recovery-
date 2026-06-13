/**
 * Server-side fetch for third-party APIs (Gemini, ElevenLabs, etc.).
 * Surfaces TLS/network failures with actionable messages on Windows dev machines.
 */
export async function externalFetch(
  url: string | URL,
  init?: RequestInit
): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const cause =
      err instanceof Error && "cause" in err && err.cause instanceof Error
        ? err.cause.message
        : "";

    if (
      message.includes("fetch failed") &&
      (cause.includes("certificate") || cause.includes("UNABLE_TO_VERIFY"))
    ) {
      throw new Error(
        "Outbound HTTPS failed (TLS certificate). Stop the dev server and run: npm run dev"
      );
    }

    throw err;
  }
}
