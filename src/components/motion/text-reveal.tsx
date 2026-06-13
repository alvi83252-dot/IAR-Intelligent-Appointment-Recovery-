"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TextRevealProps {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  delay?: number;
  splitBy?: "words" | "chars";
}

export function TextReveal({
  text,
  className,
  as: Tag = "h1",
  delay = 0,
  splitBy = "words",
}: TextRevealProps) {
  const reducedMotion = useReducedMotion();
  const units =
    splitBy === "words"
      ? text.split(" ")
      : text.split("");

  if (reducedMotion) {
    return <Tag className={className}>{text}</Tag>;
  }

  return (
    <Tag className={cn("overflow-hidden", className)} aria-label={text}>
      <span className="sr-only">{text}</span>
      <motion.span
        className="inline-flex flex-wrap"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: { staggerChildren: splitBy === "words" ? 0.06 : 0.02, delayChildren: delay },
          },
        }}
        aria-hidden
      >
        {units.map((unit, i) => (
          <motion.span
            key={`${unit}-${i}`}
            className="inline-block overflow-hidden"
            variants={{
              hidden: { y: "110%", opacity: 0, rotateX: 40 },
              visible: {
                y: 0,
                opacity: 1,
                rotateX: 0,
                transition: { duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] },
              },
            }}
          >
            <span className="inline-block">
              {unit}
              {splitBy === "words" && i < units.length - 1 ? "\u00A0" : ""}
            </span>
          </motion.span>
        ))}
      </motion.span>
    </Tag>
  );
}

export function FadeUp({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.7, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
}
