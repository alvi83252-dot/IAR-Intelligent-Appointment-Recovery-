"use client";

import { motion } from "framer-motion";
import { ArrowLeftRight, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useIARStore } from "@/hooks/use-iar-store";
import { formatDateTime } from "@/lib/utils";

export default function SwapCenterPage() {
  const swapProposals = useIARStore((s) => s.swapProposals);
  const acceptSwap = useIARStore((s) => s.acceptSwap);
  const declineSwap = useIARStore((s) => s.declineSwap);
  const isProcessing = useIARStore((s) => s.isProcessing);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10">
            <ArrowLeftRight className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Swap Center</h1>
            <p className="text-muted-foreground">
              Slot exchange negotiations between patients for capacity optimization
            </p>
          </div>
        </div>
      </motion.div>

      <div className="mt-8 space-y-6">
        {swapProposals.map((proposal, i) => (
          <motion.div
            key={proposal.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-orange-500/5 to-transparent">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Swap Proposal</CardTitle>
                  <Badge
                    variant={
                      proposal.status === "pending"
                        ? "warning"
                        : proposal.status === "accepted"
                          ? "success"
                          : "secondary"
                    }
                    className="capitalize"
                  >
                    {proposal.status}
                  </Badge>
                </div>
                <CardDescription>
                  Proposed {formatDateTime(proposal.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
                    <p className="text-xs font-medium uppercase text-orange-600 dark:text-orange-400">
                      Urgent Patient
                    </p>
                    <p className="mt-1 font-semibold">{proposal.urgentPatientName}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Needs earlier care</p>
                  </div>
                  <div className="flex items-center justify-center">
                    <ArrowLeftRight className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-4 sm:col-start-2">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Candidate Patient
                    </p>
                    <p className="mt-1 font-semibold">{proposal.candidatePatientName}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Current slot: {formatDateTime(proposal.proposedSlot)}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-medium">Rationale</h3>
                  <p className="text-sm text-muted-foreground">{proposal.rationale}</p>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-medium">Impact Analysis</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {Object.entries(proposal.impactAnalysis).map(([key, value]) => (
                      <div key={key} className="rounded-lg bg-muted/50 p-3">
                        <p className="text-[10px] font-medium uppercase text-muted-foreground">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </p>
                        <p className="mt-1 text-sm font-medium">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {proposal.status === "pending" && (
                  <div className="flex gap-3 border-t pt-4">
                    <Button
                      variant="premium"
                      className="flex-1"
                      disabled={isProcessing}
                      onClick={() => acceptSwap(proposal.id)}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Accept Swap
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={isProcessing}
                      onClick={() => declineSwap(proposal.id)}
                    >
                      <X className="h-4 w-4" /> Decline
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
