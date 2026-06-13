"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Calendar,
  Loader2,
  Play,
  RefreshCw,
  Settings,
  ArrowLeftRight,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useIARStore } from "@/hooks/use-iar-store";
import { DEMO_SCENARIOS } from "@/services/mock-data";
import { APP_NAME, isDemoMode, PAS_LEDGER_NAME } from "@/lib/config";
import { ScrollReveal } from "@/components/motion/scroll-reveal";

const scenarioIcons: Record<string, React.ElementType> = {
  scenario_1: Calendar,
  scenario_2: Calendar,
  scenario_3: ArrowLeftRight,
  scenario_4: AlertTriangle,
};

const scenarioActions: Record<string, { label: string; href?: string; action?: string }> = {
  scenario_1: { label: "Start", href: "/request" },
  scenario_2: { label: "Run Conflict Demo", action: "conflict" },
  scenario_3: { label: "Open Swap Center", href: "/swap" },
  scenario_4: { label: "Run Cascade", action: "disruption" },
};

export default function DemoControlCenterPage() {
  const resetDemo = useIARStore((s) => s.resetDemo);
  const runCalendarConflictDemo = useIARStore((s) => s.runCalendarConflictDemo);
  const runDisruptionRecovery = useIARStore((s) => s.runDisruptionRecovery);
  const isProcessing = useIARStore((s) => s.isProcessing);
  const demoScenarioRunning = useIARStore((s) => s.demoScenarioRunning);

  const handleAction = async (scenarioId: string) => {
    const config = scenarioActions[scenarioId];
    if (config.action === "conflict") await runCalendarConflictDemo();
    if (config.action === "disruption") await runDisruptionRecovery();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-iar-teal/10">
              <Settings className="h-6 w-6 text-iar-teal" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Demo Control Center</h1>
              <p className="text-muted-foreground">
                Run guided scenarios — no external APIs required
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isDemoMode && <Badge variant="success">DEMO_MODE=true</Badge>}
            <Button variant="outline" onClick={resetDemo}>
              <RefreshCw className="h-4 w-4" /> Reset Demo
            </Button>
          </div>
        </div>
      </motion.div>

      <Card className="mt-8 border-iar-teal/20 bg-iar-teal/5">
        <CardContent className="p-6">
          <p className="text-sm">
            <strong>Demo Mode</strong> — {APP_NAME} agents coordinate GP appointments and write to a mock{" "}
            <strong>{PAS_LEDGER_NAME}</strong> PAS ledger. No external APIs required.
          </p>
        </CardContent>
      </Card>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {DEMO_SCENARIOS.map((scenario, i) => {
          const Icon = scenarioIcons[scenario.id] ?? Play;
          const action = scenarioActions[scenario.id];
          const isRunning = demoScenarioRunning === scenario.id;

          return (
            <motion.div
              key={scenario.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                      <Icon className="h-5 w-5 text-iar-teal" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{scenario.name}</CardTitle>
                      <CardDescription className="text-xs">
                        Scenario {i + 1}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{scenario.description}</p>
                  <ol className="space-y-1">
                    {scenario.steps.map((step, j) => (
                      <li key={step} className="flex gap-2 text-xs text-muted-foreground">
                        <span className="font-mono text-iar-teal">{j + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  {action.href ? (
                    <Button variant="premium" className="w-full" asChild>
                      <Link href={action.href}>
                        <Play className="h-4 w-4" /> {action.label}
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="premium"
                      className="w-full"
                      disabled={isProcessing}
                      onClick={() => handleAction(scenario.id)}
                    >
                      {isRunning ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      {action.label}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Quick Navigation</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {[
            { href: "/dashboard", label: "Patient Dashboard" },
            { href: "/agents", label: "Agent Activity" },
            { href: "/swap", label: "Swap Center" },
            { href: "/disruption", label: "Disruption Dashboard" },
            { href: "/practice", label: "PAS Ledger" },
            { href: "/timeline", label: "Timeline" },
          ].map((link) => (
            <Button key={link.href} variant="outline" size="sm" asChild>
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
