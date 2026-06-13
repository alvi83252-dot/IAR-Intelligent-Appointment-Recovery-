"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Keyboard, Loader2, Mic, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SpeakButton } from "@/components/access/voice-controls";
import { FadeUp } from "@/components/motion/text-reveal";
import { APP_FULL_NAME, APP_NAME } from "@/lib/config";
import { buildOptionsScript, speakText } from "@/lib/voice/client";
import { useAccessMode } from "@/lib/voice/use-access-mode";

const modeChoices = [
  {
    id: "text" as const,
    label: "Continue with text",
    description: "Read and tap on screen — best if you prefer typing or reading.",
    icon: Keyboard,
  },
  {
    id: "voice" as const,
    label: "Continue with voice",
    description: "Listen and speak — IAR reads options aloud and accepts voice input.",
    icon: Mic,
  },
];

export function AccessModePicker() {
  const router = useRouter();
  const { setMode } = useAccessMode();
  const reducedMotion = useReducedMotion();
  const [pending, setPending] = useState<"text" | "voice" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const optionsScript = buildOptionsScript(
    `Welcome to ${APP_NAME}, ${APP_FULL_NAME}. How would you like to continue?`,
    modeChoices.map(({ label, description }) => ({ label, description }))
  );

  const chooseMode = async (mode: "text" | "voice") => {
    setError(null);
    setPending(mode);
    setMode(mode);

    if (mode === "voice") {
      const result = await speakText(
        "Voice mode selected. I will read your options aloud and you can speak your answers. Let's request your appointment."
      );
      if (result.source === "none") {
        setError("Premium voice unavailable — browser speech and text mode still work.");
      }
    }

    setPending(null);
    router.push("/request");
  };

  return (
    <div className="relative mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16 lg:pl-10">

      <FadeUp className="text-center">
        <motion.div
          animate={reducedMotion ? undefined : { y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-iar-teal/10 shadow-lg shadow-iar-teal/10"
        >
          <Volume2 className="h-8 w-8 text-iar-teal" aria-hidden />
        </motion.div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          How would you like to use {APP_NAME}?
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
          Choose text or voice. You can change this any time by returning to this screen.
        </p>
        <SpeakButton
          text={optionsScript}
          label="Listen to options"
          className="mt-4 flex justify-center"
        />
      </FadeUp>

      <div className="mt-10 grid gap-4 sm:grid-cols-2" role="list">
        {modeChoices.map((choice, index) => {
          const Icon = choice.icon;
          const isLoading = pending === choice.id;

          return (
            <motion.div
              key={choice.id}
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.1, duration: 0.55 }}
              whileHover={reducedMotion ? undefined : { y: -8, scale: 1.02 }}
              role="listitem"
            >
              <Card className="h-full border-iar-teal/20 transition-shadow hover:shadow-xl hover:shadow-iar-teal/10">
                <CardHeader>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-iar-teal/10 text-sm font-semibold text-iar-teal">
                      {index + 1}
                    </span>
                    <Icon className="h-5 w-5 text-iar-teal" aria-hidden />
                  </div>
                  <CardTitle className="text-xl">{choice.label}</CardTitle>
                  <CardDescription>{choice.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="premium"
                    className="w-full"
                    disabled={!!pending}
                    onClick={() => void chooseMode(choice.id)}
                    aria-label={`Option ${index + 1}: ${choice.label}`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Starting…
                      </>
                    ) : (
                      <>Select option {index + 1}</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {error && (
        <p className="mt-6 text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Voice mode uses ElevenLabs for speech. Text mode works fully without a microphone.
      </p>
    </div>
  );
}
