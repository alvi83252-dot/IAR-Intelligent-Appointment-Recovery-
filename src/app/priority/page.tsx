"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Brain, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge } from "@/components/priority/priority-badge";
import { useIARStore } from "@/hooks/use-iar-store";
import { assessPriority } from "@/lib/priority";

export default function PriorityAssessmentPage() {
  const lastAssessment = useIARStore((s) => s.lastAssessment);
  const lastBooked = useIARStore((s) => s.lastBookedAppointment);

  const assessment = lastAssessment ?? assessPriority("Routine check-up", 5);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10">
            <Brain className="h-6 w-6 text-violet-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Priority Assessment</h1>
            <p className="text-muted-foreground">Research Agent clinical triage results</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-8"
      >
        <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Priority Score</CardTitle>
              <PriorityBadge band={assessment.band} score={assessment.score} />
            </div>
            <CardDescription>
              Confidence: {(assessment.confidence * 100).toFixed(0)}%
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Score</span>
                <span className="font-bold">{assessment.score}/100</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${assessment.score}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-iar-teal"
                />
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium">Clinical Rationale</h3>
              <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                {assessment.rationale}
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium">Recommendations</h3>
              <ul className="space-y-2">
                {assessment.recommendations.map((rec, i) => (
                  <motion.li
                    key={rec}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="flex items-start gap-2 text-sm"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-iar-teal" />
                    {rec}
                  </motion.li>
                ))}
              </ul>
            </div>

            {lastBooked && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Front Desk Agent has confirmed your appointment
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {lastBooked.providerName} · {new Date(lastBooked.dateTime).toLocaleString()}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="premium" className="flex-1" asChild>
                <Link href="/confirmation">
                  View Confirmation <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/agents">View Agent Activity</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
