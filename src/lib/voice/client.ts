"use client";

import {
  isBrowserSttAvailable,
  isBrowserTtsAvailable,
  listenWithBrowser,
  speakWithBrowser,
  stopBrowserSpeech,
  type SpeechSource,
} from "@/lib/voice/browser-speech";

let activeAudio: HTMLAudioElement | null = null;

export type SpeakResult = {
  source: SpeechSource;
  fallback?: boolean;
};

export async function speakText(text: string): Promise<SpeakResult> {
  stopSpeaking();

  try {
    const response = await fetch("/api/voice/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const contentType = response.headers.get("content-type") ?? "";

    if (response.ok && contentType.includes("audio")) {
      const blob = await response.blob();
      await playAudioBlob(blob);
      return { source: "elevenlabs" };
    }

    throw new Error("ElevenLabs unavailable");
  } catch {
    if (isBrowserTtsAvailable()) {
      try {
        await speakWithBrowser(text);
        return { source: "browser", fallback: true };
      } catch {
        return { source: "none" };
      }
    }
    return { source: "none" };
  }
}

async function playAudioBlob(blob: Blob): Promise<void> {
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    activeAudio = audio;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      if (activeAudio === audio) activeAudio = null;
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not play speech"));
    };
    void audio.play();
  });
}

export function stopSpeaking() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
  stopBrowserSpeech();
}

export type TranscribeResult = {
  text: string;
  source: "elevenlabs" | "browser";
  fallback?: boolean;
};

export async function transcribeAudio(blob: Blob): Promise<TranscribeResult> {
  const formData = new FormData();
  formData.append("file", blob, "recording.webm");

  try {
    const response = await fetch("/api/voice/stt", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const data = (await response.json()) as { text?: string };
      const text = data.text?.trim() ?? "";
      if (text) return { text, source: "elevenlabs" };
    }
  } catch {
    /* fall through */
  }

  if (isBrowserSttAvailable()) {
    try {
      const text = await listenWithBrowser();
      return { text, source: "browser", fallback: true };
    } catch {
      /* fall through */
    }
  }

  throw new Error("Voice input unavailable — please type instead.");
}

export function parseOptionChoice(
  input: string,
  optionCount: number
): number | null {
  const normalized = input.toLowerCase().trim();
  const numberMatch = normalized.match(/\b(\d+)\b/);
  if (numberMatch) {
    const n = Number(numberMatch[1]);
    if (n >= 1 && n <= optionCount) return n - 1;
  }

  const words: Record<string, number> = {
    one: 0,
    first: 0,
    two: 1,
    second: 1,
    three: 2,
    third: 2,
    four: 3,
    fourth: 3,
    five: 4,
    fifth: 4,
  };

  for (const [word, index] of Object.entries(words)) {
    if (normalized.includes(word) && index < optionCount) return index;
  }

  return null;
}

export function buildOptionsScript(
  intro: string,
  options: { label: string; description: string }[]
): string {
  const lines = options.map(
    (option, index) =>
      `Option ${index + 1}: ${option.label}. ${option.description}`
  );
  return `${intro} ${lines.join(" ")} You can tap an option or say the option number.`;
}
