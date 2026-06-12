"use client";

import { motion } from "framer-motion";
import { Database, FileText, Layers } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { useCareFlowStore } from "@/hooks/use-careflow-store";
import { APP_NAME, PAS_LEDGER_DESCRIPTION, PAS_LEDGER_NAME } from "@/lib/config";
import { formatDateTime } from "@/lib/utils";

export default function PasLedgerPage() {
  const pasSnapshot = useCareFlowStore((s) => s.pasSnapshot);
  const pasWriteLog = useCareFlowStore((s) => s.pasWriteLog);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <ScrollReveal>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-careflow-teal/10">
            <Layers className="h-6 w-6 text-careflow-teal" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">PAS Ledger Integration</h1>
            <p className="text-muted-foreground">
              Agent read/write activity on {PAS_LEDGER_NAME} — not a staff admin UI
            </p>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.1} className="mt-6">
        <Card className="border-careflow-teal/20 bg-gradient-to-br from-careflow-teal/5 to-transparent">
          <CardContent className="flex items-start gap-4 p-6">
            <Database className="mt-0.5 h-5 w-5 shrink-0 text-careflow-teal" />
            <div>
              <p className="font-medium">
                {APP_NAME} is an orchestration layer — {PAS_LEDGER_NAME} is the ledger
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{PAS_LEDGER_DESCRIPTION}</p>
            </div>
          </CardContent>
        </Card>
      </ScrollReveal>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total GP Slots", value: pasSnapshot.totalSlots },
          { label: "Booked in Ledger", value: pasSnapshot.bookedSlots },
          { label: "Available", value: pasSnapshot.availableSlots },
        ].map((stat, i) => (
          <ScrollReveal key={stat.label} delay={i * 0.08}>
            <Card>
              <CardContent className="p-6">
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </ScrollReveal>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <ScrollReveal delay={0.1}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Ledger Snapshot
              </CardTitle>
              <CardDescription>
                {pasSnapshot.practiceName} · {pasSnapshot.ledger}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {pasSnapshot.appointments.slice(0, 6).map((apt) => (
                <motion.div
                  key={apt.id}
                  whileHover={{ x: 4 }}
                  className="rounded-lg border border-border/50 p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{apt.patientName}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {apt.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {apt.providerName} · {formatDateTime(apt.dateTime)}
                  </p>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <Card>
            <CardHeader>
              <CardTitle>Front Desk Agent Write Log</CardTitle>
              <CardDescription>Operations written to {PAS_LEDGER_NAME}</CardDescription>
            </CardHeader>
            <CardContent>
              {pasWriteLog.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Run a demo scenario to see PAS ledger writes.
                </p>
              ) : (
                <div className="max-h-[320px] space-y-2 overflow-y-auto">
                  {pasWriteLog.map((entry, i) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-lg bg-muted/40 p-3 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-[10px] capitalize">
                          {entry.operation}
                        </Badge>
                        <span className="text-muted-foreground">
                          {formatDateTime(entry.timestamp)}
                        </span>
                      </div>
                      <p className="mt-1">{entry.summary}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>
    </div>
  );
}
