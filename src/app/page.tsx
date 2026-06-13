"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Bot,
  Calendar,
  Database,
  RefreshCw,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { StatCard } from "@/components/metrics/stat-card";
import { ScrollReveal, StaggerReveal, StaggerItem } from "@/components/motion/scroll-reveal";
import {
  APP_FULL_NAME,
  APP_NAME,
  APP_TAGLINE,
  PAS_LEDGER_NAME,
} from "@/lib/config";
import { AGENT_CARDS } from "@/agents/agent-cards";

const metrics = [
  { title: "Capacity Recovered", value: "847", subtitle: "GP slots this month", icon: RefreshCw, trend: "+23% via agent coordination" },
  { title: "Avg Wait Reduction", value: "4.2d", subtitle: "for urgent patients", icon: Zap, trend: "Through intelligent swaps" },
  { title: "Recovery Success", value: "94%", subtitle: "disruption cascades", icon: Shield, trend: "PAS ledger recovery" },
  { title: "Agent Tasks", value: "12.4k", subtitle: "A2A messages processed", icon: Bot, trend: "Real-time coordination" },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-hero-gradient" />
      <motion.div
        animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
        className="pointer-events-none absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-iar-teal/10 blur-3xl"
      />
      <motion.div
        animate={{ y: [0, 15, 0], x: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
        className="pointer-events-none absolute -bottom-40 left-0 h-[400px] w-[400px] rounded-full bg-iar-sky/10 blur-3xl"
      />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <motion.div
            whileHover={{ rotate: 10, scale: 1.05 }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-iar-teal to-iar-teal-light"
          >
            <Activity className="h-5 w-5 text-white" />
          </motion.div>
          <div>
            <span className="text-xl font-semibold">{APP_NAME}</span>
            <p className="text-[10px] text-muted-foreground">{APP_FULL_NAME}</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-12 sm:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-4xl text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-iar-teal/30 bg-iar-teal/10 px-4 py-1.5 text-sm text-iar-teal">
            <Sparkles className="h-4 w-4" />
            GP-side · Patient-facing · Agent-orchestrated
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            {APP_TAGLINE.split(" ").slice(0, 3).join(" ")}{" "}
            <span className="text-gradient">
              {APP_TAGLINE.split(" ").slice(3).join(" ")}
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            {APP_NAME} intelligently coordinates GP appointments through interoperable AI agents —
            sitting on top of <strong className="text-foreground">{PAS_LEDGER_NAME}</strong>, not replacing it.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button variant="premium" size="lg" asChild>
              <Link href="/dashboard">
                Start Demo <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/agents">Explore Agents</Link>
            </Button>
          </div>
        </motion.div>

        <ScrollReveal className="mt-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((m, i) => (
              <StatCard key={m.title} {...m} index={i} />
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal className="mt-24" delay={0.1}>
          <div className="rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur-sm sm:p-8">
            <div className="flex items-start gap-4">
              <Database className="h-6 w-6 shrink-0 text-iar-teal" />
              <div>
                <h2 className="text-lg font-semibold">Complement, not copy</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {PAS_LEDGER_NAME} is the NHS PAS/EPR ledger that hospital staff administer.
                  {APP_NAME} is the patient-facing orchestration layer — agents negotiate appointments
                  and write results back to the ledger. GP-side, not hospital-side. Agents, not forms.
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal className="mt-24">
          <h2 className="mb-2 text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Agent Architecture
          </h2>
          <p className="mb-10 text-center text-2xl font-semibold">
            Three agents. One orchestration layer over the PAS ledger.
          </p>
          <StaggerReveal className="grid gap-6 md:grid-cols-3">
            {AGENT_CARDS.map((agent) => (
              <StaggerItem key={agent.id}>
                <Card className="h-full border-iar-teal/20 bg-gradient-to-b from-card to-iar-teal/5 transition-shadow hover:shadow-lg hover:shadow-iar-teal/5">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-iar-teal/10">
                      <Bot className="h-6 w-6 text-iar-teal" />
                    </div>
                    <h3 className="text-lg font-semibold">{agent.name}</h3>
                    <p className="text-sm text-iar-teal">{agent.role}</p>
                    <p className="mt-3 text-sm text-muted-foreground">{agent.description}</p>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerReveal>
        </ScrollReveal>

        <ScrollReveal className="mt-24" delay={0.1}>
          <div className="rounded-3xl border border-border/60 bg-card/50 p-8 backdrop-blur-sm sm:p-12">
            <div className="grid items-center gap-8 lg:grid-cols-2">
              <div>
                <h2 className="text-3xl font-bold">See the workflow in action</h2>
                <p className="mt-4 text-muted-foreground">
                  From GP appointment requests to disruption recovery — watch agents
                  coordinate and write to the PAS ledger in real time.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "Patient request → priority assessment → PAS ledger booking",
                    "Calendar conflict detection and auto-reschedule",
                    "Urgent patient slot swap negotiation",
                    "GP partner absence disruption cascade",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 shrink-0 text-iar-teal" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button variant="premium" className="mt-8" asChild>
                  <Link href="/demo">Open Demo Control Center</Link>
                </Button>
              </div>
              <div className="relative flex h-64 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-iar-teal/20 to-iar-sky/10">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="text-center"
                >
                  <Activity className="mx-auto h-16 w-16 text-iar-teal" />
                  <p className="mt-4 text-sm font-medium">Live Agent Coordination</p>
                  <p className="text-xs text-muted-foreground">A2A · {PAS_LEDGER_NAME} Adapter</p>
                </motion.div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <footer className="relative z-10 border-t border-border/40 py-8 text-center text-sm text-muted-foreground">
        {APP_NAME} — Orchestration layer for GP appointment routing · Ledger: {PAS_LEDGER_NAME}
      </footer>
    </div>
  );
}
