"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  index?: number;
  className?: string;
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, index = 0, className }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
              {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
              {trend && (
                <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">{trend}</p>
              )}
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-careflow-teal/10">
              <Icon className="h-5 w-5 text-careflow-teal" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
