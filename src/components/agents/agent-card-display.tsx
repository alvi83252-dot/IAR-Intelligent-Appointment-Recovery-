"use client";

import { motion } from "framer-motion";
import { Bot, CheckCircle2, Loader2, Radio } from "lucide-react";
import type { AgentCard } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const agentColors: Record<string, string> = {
  personal: "from-blue-500/20 to-indigo-500/10 border-blue-500/30",
  "front-desk": "from-teal-500/20 to-emerald-500/10 border-teal-500/30",
  research: "from-violet-500/20 to-purple-500/10 border-violet-500/30",
};

const statusIcon = {
  idle: Radio,
  active: Loader2,
  processing: Loader2,
  completed: CheckCircle2,
};

interface AgentCardDisplayProps {
  agent: AgentCard;
  index?: number;
}

export function AgentCardDisplay({ agent, index = 0 }: AgentCardDisplayProps) {
  const StatusIcon = statusIcon[agent.status];
  const isAnimating = agent.status === "processing" || agent.status === "active";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className={cn("bg-gradient-to-br", agentColors[agent.id])}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/80">
                <Bot className="h-5 w-5 text-iar-teal" />
              </div>
              <div>
                <CardTitle className="text-base">{agent.name}</CardTitle>
                <CardDescription>{agent.role}</CardDescription>
              </div>
            </div>
            <Badge
              variant={agent.status === "completed" ? "success" : "secondary"}
              className="gap-1 capitalize"
            >
              <StatusIcon className={cn("h-3 w-3", isAnimating && "animate-spin")} />
              {agent.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{agent.description}</p>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Supported Tasks
            </p>
            <div className="flex flex-wrap gap-1.5">
              {agent.supportedTasks.map((task) => (
                <Badge key={task} variant="outline" className="font-mono text-[10px]">
                  {task}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Skills
            </p>
            <div className="space-y-1">
              {agent.skills.map((skill) => (
                <div key={skill.id} className="text-xs">
                  <span className="font-medium">{skill.name}</span>
                  <span className="text-muted-foreground"> — {skill.description}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="font-mono text-[10px] text-muted-foreground">{agent.endpoint}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
