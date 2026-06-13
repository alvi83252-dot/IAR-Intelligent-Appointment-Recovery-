"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VoiceInputButton } from "@/components/access/voice-controls";
import { cn } from "@/lib/utils";
import {
  buildOptionsScript,
  parseOptionChoice,
  speakText,
  stopSpeaking,
} from "@/lib/voice/client";
import { useAccessMode } from "@/lib/voice/use-access-mode";

export interface PresentedOption {
  id: string;
  label: string;
  description: string;
  href?: string;
  onSelect?: () => void;
}

interface VoiceOptionsPanelProps {
  title: string;
  intro: string;
  options: PresentedOption[];
}

export function VoiceOptionsPanel({ title, intro, options }: VoiceOptionsPanelProps) {
  const { isVoice } = useAccessMode();
  const [spoken, setSpoken] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceHint, setVoiceHint] = useState<string | null>(null);

  const script = buildOptionsScript(intro, options);

  useEffect(() => {
    if (!isVoice || spoken) return;

    setSpeaking(true);
    void speakText(script)
      .then((result) => {
        setSpoken(true);
        if (result.fallback) {
          setVoiceHint("Read via browser voice — ElevenLabs unavailable.");
        }
      })
      .catch(() => {
        setSpoken(true);
        setVoiceHint("Please read the numbered options below.");
      })
      .finally(() => setSpeaking(false));

    return () => stopSpeaking();
  }, [isVoice, script, spoken]);

  const handleVoiceChoice = (transcript: string) => {
    const index = parseOptionChoice(transcript, options.length);
    if (index === null) {
      setVoiceHint(`I heard "${transcript}". Say option 1 to ${options.length}, or tap a button below.`);
      return;
    }

    const option = options[index];
    setVoiceHint(`Selected option ${index + 1}: ${option.label}`);
    option.onSelect?.();
    if (option.href) window.location.href = option.href;
  };

  return (
    <Card className="mt-8 border-iar-teal/20">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {isVoice
            ? "Options are read aloud. Tap a card or say the option number."
            : "Choose your next step below."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isVoice && (
          <div className="rounded-xl border border-iar-teal/30 bg-iar-teal/5 p-4">
            <p className="text-sm font-medium text-iar-teal">
              {speaking ? "Reading your options…" : "Voice guidance active"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Example: say &quot;option 1&quot; or &quot;option two&quot;.
            </p>
            <VoiceInputButton
              className="mt-3"
              label="Say your choice"
              onTranscript={handleVoiceChoice}
            />
            {voiceHint && (
              <p className="mt-2 text-sm text-muted-foreground" role="status">
                {voiceHint}
              </p>
            )}
          </div>
        )}

        <div className="grid gap-3" role="list">
          {options.map((option, index) => {
            const content = (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
                className={cn(
                  "flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-colors",
                  "hover:border-iar-teal/50 hover:bg-iar-teal/5"
                )}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-iar-teal/10 text-sm font-bold text-iar-teal"
                  aria-hidden
                >
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold">{option.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
                </div>
                {option.href?.startsWith("http") && (
                  <ExternalLink className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </motion.div>
            );

            if (option.href) {
              const isExternal = option.href.startsWith("http");
              return (
                <div key={option.id} role="listitem">
                  {isExternal ? (
                    <a
                      href={option.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                      aria-label={`Option ${index + 1}: ${option.label}`}
                    >
                      {content}
                    </a>
                  ) : (
                    <Link
                      href={option.href}
                      className="block"
                      aria-label={`Option ${index + 1}: ${option.label}`}
                      onClick={() => option.onSelect?.()}
                    >
                      {content}
                    </Link>
                  )}
                </div>
              );
            }

            return (
              <div key={option.id} role="listitem">
                <button
                  type="button"
                  className="block w-full"
                  aria-label={`Option ${index + 1}: ${option.label}`}
                  onClick={() => option.onSelect?.()}
                >
                  {content}
                </button>
              </div>
            );
          })}
        </div>

        {isVoice && speaking && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Preparing voice output…
          </p>
        )}
      </CardContent>
    </Card>
  );
}
