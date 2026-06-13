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

import { AmbientOrbs, Parallax, ScrollHint } from "@/components/motion/parallax";

import { ScrollReveal, StaggerReveal, StaggerItem } from "@/components/motion/scroll-reveal";

import { SectionDivider } from "@/components/motion/section-divider";

import { FadeUp, TextReveal } from "@/components/motion/text-reveal";

import {

  APP_FULL_NAME,

  APP_NAME,

  APP_TAGLINE,

  PAS_LEDGER_NAME,

} from "@/lib/config";

import { AGENT_CARDS } from "@/agents/agent-cards";



const metrics = [

  {

    title: "Capacity Recovered",

    value: "847",

    subtitle: "GP slots this month",

    icon: RefreshCw,

    trend: "+23% via agent coordination",

  },

  {

    title: "Avg Wait Reduction",

    value: "4.2d",

    subtitle: "for urgent patients",

    icon: Zap,

    trend: "Through intelligent swaps",

  },

  {

    title: "Recovery Success",

    value: "94%",

    subtitle: "disruption cascades",

    icon: Shield,

    trend: "PAS ledger recovery",

  },

  {

    title: "Agent Tasks",

    value: "12.4k",

    subtitle: "A2A messages processed",

    icon: Bot,

    trend: "Real-time coordination",

  },

];



const workflowItems = [

  "Patient request → priority assessment → PAS ledger booking",

  "Calendar conflict detection and auto-reschedule",

  "Urgent patient slot swap negotiation",

  "GP partner absence disruption cascade",

];



export default function LandingPage() {

  const taglineLead = APP_TAGLINE.split(" ").slice(0, 3).join(" ");

  const taglineAccent = APP_TAGLINE.split(" ").slice(3).join(" ");



  return (

    <div className="relative min-h-screen overflow-hidden lg:pl-6">

      <div className="pointer-events-none absolute inset-0 bg-hero-gradient" />

      <AmbientOrbs />



      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">

        <FadeUp className="flex items-center gap-2">

          <motion.div

            whileHover={{ rotate: 10, scale: 1.05 }}

            whileTap={{ scale: 0.98 }}

            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-iar-teal to-iar-teal-light shadow-lg shadow-iar-teal/20"

          >

            <Activity className="h-5 w-5 text-white" />

          </motion.div>

          <div>

            <span className="text-xl font-semibold">{APP_NAME}</span>

            <p className="text-[10px] text-muted-foreground">{APP_FULL_NAME}</p>

          </div>

        </FadeUp>

        <FadeUp delay={0.1}>

          <ThemeToggle />

        </FadeUp>

      </header>



      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-12 sm:pt-20">

        <div className="mx-auto max-w-4xl text-center">

          <FadeUp delay={0.05}>

            <motion.div

              whileHover={{ scale: 1.02 }}

              className="mb-6 inline-flex items-center gap-2 rounded-full border border-iar-teal/30 bg-iar-teal/10 px-4 py-1.5 text-sm text-iar-teal backdrop-blur-sm"

            >

              <Sparkles className="h-4 w-4" />

              GP-side · Patient-facing · Agent-orchestrated

            </motion.div>

          </FadeUp>



          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">

            <TextReveal

              text={`${taglineLead} `}

              as="span"

              className="inline"

              delay={0.15}

            />

            <motion.span

              initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}

              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}

              transition={{ delay: 0.55, duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}

              className="text-gradient"

            >

              {taglineAccent}

            </motion.span>

          </h1>



          <FadeUp delay={0.65} className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">

            {APP_NAME} intelligently coordinates GP appointments through interoperable AI agents —

            sitting on top of <strong className="text-foreground">{PAS_LEDGER_NAME}</strong>, not

            replacing it.

          </FadeUp>



          <FadeUp delay={0.8} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">

            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>

              <Button variant="premium" size="lg" asChild>

                <Link href="/start">

                  Get Started <ArrowRight className="h-4 w-4" />

                </Link>

              </Button>

            </motion.div>

            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>

              <Button variant="outline" size="lg" asChild>

                <Link href="/agents">Explore Agents</Link>

              </Button>

            </motion.div>

          </FadeUp>



          <ScrollHint />

        </div>



        <SectionDivider className="mt-8" />



        <ScrollReveal className="mt-12">

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {metrics.map((m, i) => (

              <StatCard key={m.title} {...m} index={i} />

            ))}

          </div>

        </ScrollReveal>



        <SectionDivider />



        <ScrollReveal className="mt-8" delay={0.1}>

          <motion.div

            whileHover={{ y: -4 }}

            transition={{ type: "spring", stiffness: 300, damping: 22 }}

            className="rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur-sm sm:p-8"

          >

            <div className="flex items-start gap-4">

              <motion.div

                animate={{ rotate: [0, 5, -5, 0] }}

                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}

                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-iar-teal/10"

              >

                <Database className="h-6 w-6 text-iar-teal" />

              </motion.div>

              <div>

                <h2 className="text-lg font-semibold">Complement, not copy</h2>

                <p className="mt-2 text-sm text-muted-foreground">

                  {PAS_LEDGER_NAME} is the NHS PAS/EPR ledger that hospital staff administer.

                  {APP_NAME} is the patient-facing orchestration layer — agents negotiate

                  appointments and write results back to the ledger. GP-side, not hospital-side.

                  Agents, not forms.

                </p>

              </div>

            </div>

          </motion.div>

        </ScrollReveal>



        <SectionDivider />



        <ScrollReveal className="mt-8">

          <div className="text-center">

            <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">

              Agent Architecture

            </h2>

            <p className="mb-10 text-2xl font-semibold sm:text-3xl">

              Three agents. One orchestration layer over the PAS ledger.

            </p>

          </div>

          <StaggerReveal className="grid gap-6 md:grid-cols-3">

            {AGENT_CARDS.map((agent) => (

              <StaggerItem key={agent.id}>

                <motion.div whileHover={{ y: -6, scale: 1.01 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>

                  <Card className="h-full border-iar-teal/20 bg-gradient-to-b from-card to-iar-teal/5 transition-shadow hover:shadow-xl hover:shadow-iar-teal/10">

                    <CardContent className="p-6">

                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-iar-teal/10">

                        <Bot className="h-6 w-6 text-iar-teal" />

                      </div>

                      <h3 className="text-lg font-semibold">{agent.name}</h3>

                      <p className="text-sm text-iar-teal">{agent.role}</p>

                      <p className="mt-3 text-sm text-muted-foreground">{agent.description}</p>

                    </CardContent>

                  </Card>

                </motion.div>

              </StaggerItem>

            ))}

          </StaggerReveal>

        </ScrollReveal>



        <SectionDivider />



        <ScrollReveal className="mt-8" delay={0.1}>

          <div className="rounded-3xl border border-border/60 bg-card/50 p-8 backdrop-blur-sm sm:p-12">

            <div className="grid items-center gap-8 lg:grid-cols-2">

              <div>

                <h2 className="text-3xl font-bold">See the workflow in action</h2>

                <p className="mt-4 text-muted-foreground">

                  From GP appointment requests to disruption recovery — watch agents coordinate and

                  write to the PAS ledger in real time.

                </p>

                <ul className="mt-6 space-y-3">

                  {workflowItems.map((item, i) => (

                    <ScrollReveal key={item} delay={i * 0.06} direction="left" scale={false}>

                      <li className="flex items-center gap-2 text-sm">

                        <Calendar className="h-4 w-4 shrink-0 text-iar-teal" />

                        {item}

                      </li>

                    </ScrollReveal>

                  ))}

                </ul>

                <motion.div className="mt-8" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>

                  <Button variant="premium" asChild>

                    <Link href="/demo">Open Demo Control Center</Link>

                  </Button>

                </motion.div>

              </div>

              <Parallax offset={24}>

                <div className="relative flex h-64 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-iar-teal/20 to-iar-sky/10">

                  <motion.div

                    animate={{ scale: [1, 1.06, 1], rotate: [0, 2, -2, 0] }}

                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}

                    className="text-center"

                  >

                    <Activity className="mx-auto h-16 w-16 text-iar-teal" />

                    <p className="mt-4 text-sm font-medium">Live Agent Coordination</p>

                    <p className="text-xs text-muted-foreground">A2A · {PAS_LEDGER_NAME} Adapter</p>

                  </motion.div>

                  <motion.div

                    className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(13,148,136,0.15),transparent_60%)]"

                    animate={{ opacity: [0.4, 0.8, 0.4] }}

                    transition={{ repeat: Infinity, duration: 3 }}

                  />

                </div>

              </Parallax>

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

