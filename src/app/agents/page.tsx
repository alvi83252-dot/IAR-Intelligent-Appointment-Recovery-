"use client";

import { motion } from "framer-motion";
import { Bot, Radio } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentCardDisplay } from "@/components/agents/agent-card-display";
import { A2AMessageFeed } from "@/components/agents/a2a-message-feed";
import { ActivityTimeline } from "@/components/timeline/activity-timeline";
import { useCareFlowStore } from "@/hooks/use-careflow-store";
import { ScrollReveal } from "@/components/motion/scroll-reveal";

export default function AgentActivityCenterPage() {
  const agentCards = useCareFlowStore((s) => s.agentCards);
  const a2aMessages = useCareFlowStore((s) => s.a2aMessages);
  const timeline = useCareFlowStore((s) => s.timeline);

  const activeAgents = agentCards.filter((a) => a.status === "processing" || a.status === "active");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <ScrollReveal>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-careflow-teal/10">
            <Bot className="h-6 w-6 text-careflow-teal" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agent Activity Center</h1>
            <p className="text-muted-foreground">
              Live A2A coordination between Personal, Front Desk, and Research agents
            </p>
          </div>
        </div>
      </ScrollReveal>

      {activeAgents.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 flex items-center gap-2 rounded-xl border border-careflow-teal/30 bg-careflow-teal/5 px-4 py-3"
        >
          <Radio className="h-4 w-4 animate-pulse text-careflow-teal" />
          <span className="text-sm">
            {activeAgents.length} agent(s) actively processing — {activeAgents.map((a) => a.name).join(", ")}
          </span>
        </motion.div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {agentCards.map((agent, i) => (
          <AgentCardDisplay key={agent.id} agent={agent} index={i} />
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <A2AMessageFeed messages={a2aMessages} />

        <Card>
          <CardHeader>
            <CardTitle>Scheduling Decisions</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTimeline events={timeline} limit={8} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
