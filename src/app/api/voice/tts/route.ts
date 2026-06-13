import { NextResponse } from "next/server";
import { externalFetch } from "@/lib/external-fetch";
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ElevenLabs API key is not configured" },
      { status: 503 }
    );
  }

  let text = "";
  try {
    const body = (await request.json()) as { text?: string };
    text = body.text?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE_ID;

  let response: Response;
  try {
    response = await externalFetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.75,
          },
        }),
      }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "TTS network error" },
      { status: 500 }
    );
  }
  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      { error: "ElevenLabs TTS request failed", detail },
      { status: response.status }
    );
  }

  const audio = await response.arrayBuffer();
  return new NextResponse(audio, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
