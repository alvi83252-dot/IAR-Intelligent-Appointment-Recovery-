"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Loader2, Play, RefreshCw, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/metrics/stat-card";
import { ActivityTimeline } from "@/components/timeline/activity-timeline";
import { useIARStore } from "@/hooks/use-iar-store";
import { formatDateTime } from "@/lib/utils";

export default function DisruptionDashboardPage() {
  const disruption = useIARStore((s) => s.disruption);
  const timeline = useIARStore((s) => s.timeline);
  const runRecovery = useIARStore((s) => s.runDisruptionRecovery);
  const isProcessing = useIARStore((s) => s.isProcessing);

  const disruptionEvents = timeline.filter(
    (e) => e.type === "disruption" || e.type === "recovery"
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Disruption Cascade</h1>
              <p className="text-muted-foreground">
                Intelligent recovery from provider absences and schedule disruptions
              </p>
            </div>
          </div>
          {disruption.status !== "completed" && (
            <Button
              variant="premium"
              onClick={runRecovery}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run Recovery Cascade
            </Button>
          )}
        </div>
      </motion.div>

      <Card className="mt-8 border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Doctor Absence Event
                <Badge
                  variant={disruption.status === "completed" ? "success" : "urgent"}
                  className="capitalize"
                >
                  {disruption.status}
                </Badge>
              </CardTitle>
              <CardDescription>
                {disruption.providerName} unavailable since {formatDateTime(disruption.startedAt)}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-3xl font-bold text-red-500">
                {disruption.affectedAppointmentIds.length}
              </p>
              <p className="text-sm text-muted-foreground">Appointments impacted</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-3xl font-bold text-emerald-500">
                {disruption.recoveredAppointmentIds.length}
              </p>
              <p className="text-sm text-muted-foreground">Appointments recovered</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Recovered Capacity"
          value={disruption.metrics.recoveredCapacity}
          subtitle="slots reclaimed"
          icon={RefreshCw}
          index={0}
        />
        <StatCard
          title="Patients Rebooked"
          value={disruption.metrics.patientsRebooked}
          subtitle="successfully rescheduled"
          icon={Users}
          index={1}
        />
        <StatCard
          title="Recovery Success"
          value={`${disruption.metrics.recoverySuccessRate}%`}
          subtitle="of affected patients"
          icon={Zap}
          index={2}
        />
        <StatCard
          title="Time Saved"
          value={`${disruption.metrics.timeSavedMinutes}m`}
          subtitle="administrative time"
          icon={RefreshCw}
          index={3}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recovery Timeline</CardTitle>
            <CardDescription>Agent actions during disruption cascade</CardDescription>
          </CardHeader>
          <CardContent>
            {disruptionEvents.length > 0 ? (
              <ActivityTimeline events={disruptionEvents} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Run the recovery cascade to see agent actions in real time.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overflow Routing</CardTitle>
            <CardDescription>Partner clinic capacity allocation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { clinic: "Riverside GP Surgery — Room 3", slots: 4, status: "Active" },
              { clinic: "Oakfield Partner Practice", slots: 2, status: "Active" },
              { clinic: "Millbrook GP Hub", slots: 3, status: "Standby" },
            ].map((route) => (
              <div
                key={route.clinic}
                className="flex items-center justify-between rounded-lg border border-border/50 p-3"
              >
                <div>
                  <p className="text-sm font-medium">{route.clinic}</p>
                  <p className="text-xs text-muted-foreground">{route.slots} slots available</p>
                </div>
                <Badge variant={route.status === "Active" ? "success" : "secondary"}>
                  {route.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
