"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeftRight,
  Bell,
  Calendar,
  CheckCircle,
  ClipboardList,
  RefreshCw,
  Stethoscope,
} from "lucide-react";
import type { TimelineEvent } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

const typeConfig: Record<
  TimelineEvent["type"],
  { icon: React.ElementType; color: string }
> = {
  request: { icon: ClipboardList, color: "bg-blue-500" },
  assessment: { icon: Stethoscope, color: "bg-violet-500" },
  booking: { icon: CheckCircle, color: "bg-emerald-500" },
  conflict: { icon: AlertTriangle, color: "bg-amber-500" },
  swap: { icon: ArrowLeftRight, color: "bg-orange-500" },
  disruption: { icon: AlertTriangle, color: "bg-red-500" },
  recovery: { icon: RefreshCw, color: "bg-teal-500" },
  notification: { icon: Bell, color: "bg-sky-500" },
  calendar: { icon: Calendar, color: "bg-indigo-500" },
};

interface ActivityTimelineProps {
  events: TimelineEvent[];
  limit?: number;
  animated?: boolean;
}

export function ActivityTimeline({ events, limit, animated = true }: ActivityTimelineProps) {
  const display = limit ? events.slice(0, limit) : events;

  return (
    <div className="relative space-y-0">
      <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />
      {display.map((event, i) => {
        const config = typeConfig[event.type];
        const Icon = config.icon;

        return (
          <motion.div
            key={event.id}
            initial={animated ? { opacity: 0, x: -20 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="relative flex gap-4 pb-6 last:pb-0"
          >
            <div
              className={cn(
                "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-lg",
                config.color
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{event.title}</p>
                {event.agentId && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] capitalize text-muted-foreground">
                    {event.agentId.replace("-", " ")} agent
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{event.description}</p>
              <p className="mt-1 text-xs text-muted-foreground/70">{formatDateTime(event.timestamp)}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
