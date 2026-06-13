"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Activity, ArrowRight, Mic, Sparkles } from "lucide-react";
import {
  CopilotChat,
  CopilotKit,
  useConfigureSuggestions,
} from "@copilotkit/react-core/v2";
import { QuotaNotice } from "@/components/chat/quota-notice";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ScrollProgress } from "@/components/motion/scroll-progress";
import { isQuotaErrorMessage } from "@/lib/copilot/gemini-health";
import { APP_FULL_NAME, APP_NAME } from "@/lib/config";
import { useAccessMode } from "@/lib/voice/use-access-mode";

export type ChatHealth =
  | { state: "checking" }
  | { state: "online"; provider?: string; mode?: "gemini" | "fallback" | "llm" }
  | {
      state: "offline";
      message: string;
      billingUrl?: string;
      docsUrl?: string;
    };

function ChatSuggestions() {
  useConfigureSuggestions({
    suggestions: [
      { title: "Book appointment", message: "I want to book a GP appointment" },
      { title: "How IAR works", message: "How does IAR help with GP appointments?" },
      { title: "Urgent help", message: "I have chest pain — what should I do?" },
    ],
    available: "before-first-message",
  });
  return null;
}

function IARChatContent({ health }: { health: ChatHealth }) {
  const router = useRouter();
  const { setMode } = useAccessMode();
  const reducedMotion = useReducedMotion();

  const providerLabel =
    health.state === "online"
      ? `Powered by ${health.provider ?? "Google Gemini"}`
      : health.state === "offline"
        ? "Chat unavailable"
        : "Checking AI status…";

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <ScrollProgress />
      <ChatSuggestions />

      {!reducedMotion && (
        <>
          <motion.div
            animate={{ y: [0, -18, 0], x: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
            className="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full bg-iar-teal/10 blur-3xl"
          />
          <motion.div
            animate={{ y: [0, 14, 0], x: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
            className="pointer-events-none absolute -left-20 bottom-32 h-64 w-64 rounded-full bg-iar-sky/10 blur-3xl"
          />
        </>
      )}

      <motion.header
        initial={reducedMotion ? false : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <motion.div
              whileHover={reducedMotion ? undefined : { rotate: 8, scale: 1.05 }}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-iar-teal to-iar-teal-light shadow-md shadow-iar-teal/20"
            >
              <Activity className="h-4 w-4 text-white" />
            </motion.div>
            <div>
              <p className="text-sm font-semibold">{APP_NAME}</p>
              <p className="text-[10px] text-muted-foreground">{APP_FULL_NAME}</p>
              <p
                className={
                  health.state === "offline"
                    ? "text-[10px] text-amber-600 dark:text-amber-400"
                    : "text-[10px] text-iar-teal"
                }
              >
                {providerLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/about">About</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/test">Test tools</Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </motion.header>

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-4">
        {health.state === "offline" && (
          <QuotaNotice
            message={health.message}
            billingUrl={health.billingUrl}
            docsUrl={health.docsUrl}
          />
        )}

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mb-4 flex flex-wrap gap-2"
        >
          {[
            { label: "Book appointment", href: "/start", variant: "outline" as const },
            { label: "Voice mode", action: "voice" as const, variant: "outline" as const },
            { label: "Get started", href: "/start", variant: "premium" as const },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.06 }}
              whileHover={reducedMotion ? undefined : { scale: 1.03 }}
              whileTap={reducedMotion ? undefined : { scale: 0.98 }}
            >
              {item.action === "voice" ? (
                <Button
                  variant={item.variant}
                  size="sm"
                  onClick={() => {
                    setMode("voice");
                    router.push("/start");
                  }}
                >
                  <Mic className="mr-1 h-3 w-3" />
                  Voice mode
                </Button>
              ) : (
                <Button variant={item.variant} size="sm" asChild>
                  <Link href={item.href!}>
                    {item.label}
                    {item.variant === "premium" && (
                      <ArrowRight className="ml-1 h-3 w-3" />
                    )}
                  </Link>
                </Button>
              )}
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="relative flex min-h-[calc(100vh-12rem)] flex-1 flex-col overflow-hidden rounded-xl border border-iar-teal/20 bg-card shadow-lg shadow-iar-teal/5"
        >
          {!reducedMotion && (
            <motion.div
              className="pointer-events-none absolute inset-0 rounded-xl"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(13,148,136,0.08), rgba(56,189,248,0.08), transparent)",
                backgroundSize: "200% 100%",
              }}
              animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
              transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            />
          )}
          <CopilotChat
            className="relative z-10 h-full min-h-[480px] flex-1"
            labels={{
              modalHeaderTitle: `${APP_NAME} Assistant`,
              chatInputPlaceholder:
                health.state === "offline"
                  ? "Ask about appointments, swaps, or urgent care…"
                  : "Ask about appointments, swaps, or urgent care…",
              welcomeMessageText:
                health.state === "offline"
                  ? `Hello! I'm ${APP_NAME}, your ${APP_FULL_NAME} assistant. How can I help today?`
                  : `Hello! I'm ${APP_NAME}, your ${APP_FULL_NAME} assistant. How can I help today?`,
            }}
          />
        </motion.div>

        <motion.p
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-muted-foreground"
        >
          <Sparkles className="h-3 w-3 text-iar-teal" />
          CopilotKit chat · Google Gemini · ElevenLabs for voice when enabled
        </motion.p>
      </main>
    </div>
  );
}

export default function HomePage() {
  const [health, setHealth] = useState<ChatHealth>({ state: "checking" });

  useEffect(() => {
    void fetch("/api/copilotkit/health")
      .then((r) => r.json())
      .then(
        (data: {
          online?: boolean;
          mode?: "gemini" | "fallback" | "llm";
          message?: string;
          provider?: string;
          billingUrl?: string;
          docsUrl?: string;
        }) => {
          if (data.online) {
            setHealth({
              state: "online",
              provider: data.provider ?? "Google Gemini",
              mode: data.mode,
            });
          } else {
            setHealth({
              state: "offline",
              message:
                data.message ??
                "Gemini could not be reached. Add credits or configure another LLM provider.",
              billingUrl: data.billingUrl,
              docsUrl: data.docsUrl,
            });
          }
        }
      )
      .catch(() => {
        setHealth({
          state: "online",
          provider: "Google Gemini",
        });
      });
  }, []);

  const handleAgentError = useCallback(
    (event: { message?: string; error?: Error }) => {
      const msg = event.message ?? event.error?.message ?? "";
      if (isQuotaErrorMessage(msg)) {
        setHealth({
          state: "online",
          provider: "Google Gemini",
        });
      }
    },
    []
  );

  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      useSingleEndpoint={false}
      showDevConsole={false}
      onError={handleAgentError}
    >
      <IARChatContent health={health} />
    </CopilotKit>
  );
}
