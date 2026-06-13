"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

interface ParallaxProps {
  children: React.ReactNode;
  className?: string;
  offset?: number;
}

export function Parallax({ children, className, offset = 40 }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset]);

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div ref={ref} className={cn(className)} style={{ y }}>
      {children}
    </motion.div>
  );
}

export function AmbientOrbs() {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-iar-teal/10 blur-3xl" />
        <div className="absolute -bottom-40 left-0 h-[400px] w-[400px] rounded-full bg-iar-sky/10 blur-3xl" />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        animate={{ y: [0, -24, 0], x: [0, 14, 0], scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 9, ease: "easeInOut" }}
        className="absolute -top-40 right-[-5%] h-[520px] w-[520px] rounded-full bg-iar-teal/12 blur-3xl"
      />
      <motion.div
        animate={{ y: [0, 18, 0], x: [0, -12, 0], scale: [1, 1.08, 1] }}
        transition={{ repeat: Infinity, duration: 11, ease: "easeInOut" }}
        className="absolute -bottom-48 left-[-8%] h-[440px] w-[440px] rounded-full bg-iar-sky/12 blur-3xl"
      />
      <motion.div
        animate={{ y: [0, -10, 0], opacity: [0.4, 0.7, 0.4] }}
        transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
        className="absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-iar-mint/10 blur-3xl"
      />
    </div>
  );
}

export function ScrollHint() {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return null;

  return (
    <motion.div
      className="mt-14 flex flex-col items-center gap-2 text-muted-foreground"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2, duration: 0.6 }}
    >
      <span className="text-xs uppercase tracking-widest">Scroll to explore</span>
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
        className="flex h-10 w-6 items-start justify-center rounded-full border border-border/60 p-1.5"
      >
        <motion.span
          animate={{ y: [0, 10, 0], opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
          className="h-2 w-1 rounded-full bg-iar-teal"
        />
      </motion.div>
    </motion.div>
  );
}
