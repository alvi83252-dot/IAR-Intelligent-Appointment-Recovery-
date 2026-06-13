import { NextResponse } from "next/server";
import { externalFetch } from "@/lib/external-fetch";
export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ElevenLabs API key is not configured" },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
  }

  const upstream = new FormData();
  upstream.append("file", file, "recording.webm");
  upstream.append("model_id", "scribe_v2");
  upstream.append("language_code", "eng");

  let response: Response;
  try {
    response = await externalFetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
      },
      body: upstream,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "STT network error" },
      { status: 500 }
    );
  }
  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      { error: "ElevenLabs STT request failed", detail },
      { status: response.status }
    );
  }

  const data = (await response.json()) as { text?: string };
  return NextResponse.json({ text: data.text ?? "" });
}
