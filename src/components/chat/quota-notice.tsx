"use client";

import Link from "next/link";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuotaNoticeProps {
  message: string;
  billingUrl?: string;
  docsUrl?: string;
}

export function QuotaNotice({ message, billingUrl, docsUrl }: QuotaNoticeProps) {
  return (
    <div
      role="alert"
      className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
    >
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="space-y-2">
          <p className="font-medium">Gemini AI chat is temporarily unavailable</p>
          <p className="text-amber-900/90 dark:text-amber-100/90">{message}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {billingUrl && (
              <Button variant="outline" size="sm" asChild className="h-8 border-amber-500/40 bg-background/80">
                <a href={billingUrl} target="_blank" rel="noopener noreferrer">
                  Add Gemini credits
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            )}
            {docsUrl && (
              <Button variant="ghost" size="sm" asChild className="h-8">
                <a href={docsUrl} target="_blank" rel="noopener noreferrer">
                  Billing docs
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            )}
            <Button variant="premium" size="sm" asChild className="h-8">
              <Link href="/start">Book appointment (still works)</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
