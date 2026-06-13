"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Bell, Calendar, ChevronRight, Plus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/metrics/stat-card";
import { PriorityBadge } from "@/components/priority/priority-badge";
import { ActivityTimeline } from "@/components/timeline/activity-timeline";
import { useIARStore } from "@/hooks/use-iar-store";
import { DEMO_PATIENT } from "@/services/mock-data";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/motion/scroll-reveal";

export default function PatientDashboard() {
  const appointments = useIARStore((s) => s.appointments);
  const notifications = useIARStore((s) => s.notifications);
  const timeline = useIARStore((s) => s.timeline);
  const capacityMetrics = useIARStore((s) => s.capacityMetrics);
  const markRead = useIARStore((s) => s.markNotificationRead);

  const upcoming = appointments
    .filter((a) => a.status !== "cancelled" && new Date(a.dateTime) > new Date())
    .slice(0, 3);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <ScrollReveal>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back</p>
            <h1 className="text-3xl font-bold tracking-tight">{DEMO_PATIENT.name}</h1>
          </div>
          <Button variant="premium" asChild>
            <Link href="/request">
              <Plus className="h-4 w-4" /> Request Appointment
            </Link>
          </Button>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.1} className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Upcoming" value={upcoming.length} subtitle="appointments" icon={Calendar} index={0} />
        <StatCard title="Priority" value="Moderate" subtitle="current band" icon={TrendingUp} index={1} />
        <StatCard
          title="Notifications"
          value={unreadCount}
          subtitle="unread"
          icon={Bell}
          index={2}
        />
        <StatCard
          title="Utilization"
          value={`${capacityMetrics.utilizationRate}%`}
          subtitle="practice capacity"
          icon={TrendingUp}
          index={3}
        />
      </ScrollReveal>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Upcoming Appointments</CardTitle>
                <CardDescription>Your scheduled care visits</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/timeline">
                  View timeline <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcoming.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No upcoming appointments.{" "}
                  <Link href="/request" className="text-iar-teal hover:underline">
                    Request one
                  </Link>
                </p>
              ) : (
                upcoming.map((apt) => (
                  <motion.div
                    key={apt.id}
                    whileHover={{ scale: 1.01 }}
                    className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 p-4"
                  >
                    <div>
                      <p className="font-medium">{apt.specialty}</p>
                      <p className="text-sm text-muted-foreground">{apt.providerName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(apt.dateTime)}</p>
                    </div>
                    <PriorityBadge band={apt.priorityBand} score={apt.priorityScore} />
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Suggested Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {[
                { href: "/swap", label: "Review Swap Proposal", desc: "Urgent slot exchange pending" },
                { href: "/practice", label: "PAS Ledger", desc: "System C IAR writes" },
                { href: "/disruption", label: "Disruption Status", desc: "GP partner absence recovery" },
                { href: "/agents", label: "Agent Activity", desc: "View live coordination" },
                { href: "/demo", label: "Run Demo Scenario", desc: "Experience full workflow" },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group rounded-xl border border-border/50 p-4 transition-colors hover:border-iar-teal/50 hover:bg-iar-teal/5"
                >
                  <p className="font-medium group-hover:text-iar-teal">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {notifications.slice(0, 5).map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
                    !n.read && "border-iar-teal/30 bg-iar-teal/5"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    {!n.read && <Badge variant="default" className="text-[10px]">New</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline events={timeline} limit={4} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
