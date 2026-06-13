"use client";

import { motion, useReducedMotion } from "framer-motion";
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

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  index = 0,
  className,
}: StatCardProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 24, scale: 0.96 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.08, duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] }}
      whileHover={reducedMotion ? undefined : { y: -6, scale: 1.02 }}
    >
      <Card
        className={cn(
          "overflow-hidden transition-shadow hover:shadow-lg hover:shadow-iar-teal/10",
          className
        )}
      >
        <CardContent className="relative p-6">
          <motion.div
            className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-iar-teal/5"
            animate={reducedMotion ? undefined : { scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ repeat: Infinity, duration: 4 + index * 0.5, ease: "easeInOut" }}
          />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
              {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
              {trend && (
                <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {trend}
                </p>
              )}
            </div>
            <motion.div
              whileHover={reducedMotion ? undefined : { rotate: 8, scale: 1.08 }}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-iar-teal/10"
            >
              <Icon className="h-5 w-5 text-iar-teal" />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
