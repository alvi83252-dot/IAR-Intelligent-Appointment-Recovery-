"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, MessageSquare } from "lucide-react";
import type { A2AMessage } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTime } from "@/lib/utils";

const agentLabels: Record<string, string> = {
  personal: "Personal",
  "front-desk": "Front Desk",
  research: "Research",
  broadcast: "All Agents",
};

interface A2AMessageFeedProps {
  messages: A2AMessage[];
  maxItems?: number;
}

export function A2AMessageFeed({ messages, maxItems = 20 }: A2AMessageFeedProps) {
  const display = messages.slice(-maxItems).reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4 text-careflow-teal" />
          A2A Message Bus
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] space-y-2 overflow-y-auto">
          <AnimatePresence initial={false}>
            {display.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No A2A messages yet. Run a demo scenario to see agent communication.
              </p>
            ) : (
              display.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-lg border border-border/50 bg-muted/30 p-3"
                >
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-medium">{agentLabels[msg.from]}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{agentLabels[msg.to]}</span>
                    <Badge variant="outline" className="ml-auto font-mono text-[10px]">
                      {msg.task}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(msg.timestamp)} · {msg.status}
                  </p>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
