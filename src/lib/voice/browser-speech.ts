"use client";

export type SpeechSource = "elevenlabs" | "browser" | "none";

let browserUtterance: SpeechSynthesisUtterance | null = null;

export function isBrowserTtsAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speakWithBrowser(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isBrowserTtsAvailable()) {
      reject(new Error("Browser speech is not available"));
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    browserUtterance = utterance;
    utterance.lang = "en-GB";
    utterance.rate = 0.95;

    utterance.onend = () => {
      browserUtterance = null;
      resolve();
    };
    utterance.onerror = () => {
      browserUtterance = null;
      reject(new Error("Browser speech failed"));
    };

    window.speechSynthesis.speak(utterance);
  });
}

export function stopBrowserSpeech() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    browserUtterance = null;
  }
}

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

interface SpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

export function isBrowserSttAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function listenWithBrowser(timeoutMs = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    const w = window as Window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;

    if (!Ctor) {
      reject(new Error("Browser speech recognition is not available"));
      return;
    }

    const recognition = new Ctor();
    recognition.lang = "en-GB";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const timer = window.setTimeout(() => {
      recognition.stop();
      finish(() => reject(new Error("Listening timed out — try again or type instead.")));
    }, timeoutMs);

    recognition.onresult = (event) => {
      window.clearTimeout(timer);
      const text = event.results[0]?.[0]?.transcript?.trim() ?? "";
      finish(() => (text ? resolve(text) : reject(new Error("No speech detected"))));
    };

    recognition.onerror = (event) => {
      window.clearTimeout(timer);
      finish(() => reject(new Error(`Speech recognition error: ${event.error}`)));
    };

    recognition.onend = () => {
      window.clearTimeout(timer);
    };

    recognition.start();
  });
}
