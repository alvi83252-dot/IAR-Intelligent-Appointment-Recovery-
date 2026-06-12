"use client";

import { motion } from "framer-motion";
import { History } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityTimeline } from "@/components/timeline/activity-timeline";
import { useCareFlowStore } from "@/hooks/use-careflow-store";

export default function AppointmentTimelinePage() {
  const timeline = useCareFlowStore((s) => s.timeline);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-careflow-teal/10">
            <History className="h-6 w-6 text-careflow-teal" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Appointment Timeline</h1>
            <p className="text-muted-foreground">
              Complete history of agent-coordinated scheduling events
            </p>
          </div>
        </div>
      </motion.div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
          <CardDescription>{timeline.length} events recorded</CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityTimeline events={timeline} />
        </CardContent>
      </Card>
    </div>
  );
}
