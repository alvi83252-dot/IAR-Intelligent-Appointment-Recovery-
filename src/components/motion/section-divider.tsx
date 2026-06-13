"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

interface SectionDividerProps {
  className?: string;
  flip?: boolean;
}

export function SectionDivider({ className, flip = false }: SectionDividerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const pathLength = useTransform(scrollYProgress, [0, 0.6], [0, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0.3, 1]);

  return (
    <div
      ref={ref}
      className={cn(
        "relative mx-auto my-16 h-12 max-w-4xl px-6",
        flip && "rotate-180",
        className
      )}
      aria-hidden
    >
      <svg viewBox="0 0 800 48" className="h-full w-full" preserveAspectRatio="none">
        <motion.path
          d="M0 24 C 80 4, 160 44, 240 24 S 400 4, 480 24 S 640 44, 720 24 L 800 24"
          fill="none"
          stroke="currentColor"
          className="text-border/50"
          strokeWidth={1}
          strokeDasharray="4 8"
        />
        {!reducedMotion && (
          <motion.path
            d="M0 24 C 80 4, 160 44, 240 24 S 400 4, 480 24 S 640 44, 720 24 L 800 24"
            fill="none"
            stroke="url(#divider-gradient)"
            strokeWidth={2}
            strokeLinecap="round"
            style={{ pathLength, opacity }}
          />
        )}
        <defs>
          <linearGradient id="divider-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0D9488" stopOpacity="0" />
            <stop offset="50%" stopColor="#0D9488" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
