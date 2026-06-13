"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listenWithBrowser } from "@/lib/voice/browser-speech";
import { speakText, stopSpeaking, transcribeAudio } from "@/lib/voice/client";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  label?: string;
  className?: string;
}

export function VoiceInputButton({
  onTranscript,
  label = "Speak",
  className,
}: VoiceInputButtonProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }, []);

  useEffect(() => {
    return () => {
      stopRecording();
      stopSpeaking();
    };
  }, [stopRecording]);

  const tryBrowserListen = async () => {
    setHint("Using browser speech — please speak now…");
    const text = await listenWithBrowser();
    onTranscript(text);
    setHint("Heard via browser speech (fallback).");
  };

  const startRecording = async () => {
    setError(null);
    setHint(null);
    stopSpeaking();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size === 0) return;

        setProcessing(true);
        try {
          const result = await transcribeAudio(blob);
          if (result.text) {
            onTranscript(result.text);
            if (result.fallback) {
              setHint("Heard via browser speech (ElevenLabs unavailable).");
            }
          } else {
            setError("No speech detected. Please try again or type instead.");
          }
        } catch {
          try {
            await tryBrowserListen();
          } catch (browserErr) {
            setError(
              browserErr instanceof Error
                ? browserErr.message
                : "Voice input failed — please type instead."
            );
          }
        } finally {
          setProcessing(false);
        }
      };

      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      try {
        setProcessing(true);
        await tryBrowserListen();
      } catch (browserErr) {
        setError(
          browserErr instanceof Error
            ? browserErr.message
            : "Microphone access is required for voice mode."
        );
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleClick = () => {
    if (processing) return;
    if (recording) stopRecording();
    else void startRecording();
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Button
        type="button"
        variant={recording ? "destructive" : "outline"}
        onClick={handleClick}
        disabled={processing}
        aria-pressed={recording}
        aria-label={recording ? "Stop recording" : label}
      >
        {processing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Processing speech…
          </>
        ) : recording ? (
          <>
            <MicOff className="h-4 w-4" /> Stop & send
          </>
        ) : (
          <>
            <Mic className="h-4 w-4" /> {label}
          </>
        )}
      </Button>
      {hint && (
        <p className="text-xs text-iar-teal" role="status">
          {hint}
        </p>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function SpeakButton({
  text,
  label = "Listen",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [speaking, setSpeaking] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const handleSpeak = async () => {
    setHint(null);
    setSpeaking(true);
    try {
      const result = await speakText(text);
      if (result.source === "browser") {
        setHint("Playing via browser voice (ElevenLabs unavailable).");
      } else if (result.source === "none") {
        setHint("Speech unavailable — please read the text on screen.");
      }
    } catch {
      setHint("Speech unavailable — please read the text on screen.");
    } finally {
      setSpeaking(false);
    }
  };

  return (
    <div className={className}>
      <Button type="button" variant="outline" size="sm" onClick={() => void handleSpeak()} disabled={speaking}>
        {speaking ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Playing…
          </>
        ) : (
          label
        )}
      </Button>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
