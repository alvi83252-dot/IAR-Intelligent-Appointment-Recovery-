"use client";

import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

const SQUIGGLE_PATH =
  "M 28 0 C 12 8, 44 16, 28 24 C 12 32, 44 40, 28 48 C 12 56, 44 64, 28 72 C 12 80, 44 88, 28 96 L 28 100";

export function ScrollSquiggle({ className }: { className?: string }) {
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 28,
    restDelta: 0.001,
  });

  const dotTop = useTransform(smoothProgress, [0, 1], ["0%", "calc(100% - 12px)"]);

  if (reducedMotion) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-y-0 left-0 z-[5] hidden w-14 lg:block xl:w-16",
        className
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 56 100"
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        <defs>
          <linearGradient id="iar-squiggle-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0D9488" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#14B8A6" stopOpacity="0.75" />
          </linearGradient>
        </defs>

        <path
          d={SQUIGGLE_PATH}
          fill="none"
          stroke="currentColor"
          className="text-iar-teal/12"
          strokeWidth={3}
          vectorEffect="non-scaling-stroke"
        />

        <motion.path
          d={SQUIGGLE_PATH}
          fill="none"
          stroke="url(#iar-squiggle-grad)"
          strokeWidth={2.5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{ pathLength: smoothProgress }}
        />
      </svg>

      <motion.div
        className="absolute left-1/2 w-3 -translate-x-1/2"
        style={{ top: dotTop }}
      >
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-iar-teal/35 motion-reduce:animate-none" />
          <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-background bg-gradient-to-br from-iar-teal to-iar-sky shadow-md shadow-iar-teal/25" />
        </span>
      </motion.div>
    </div>
  );
}
