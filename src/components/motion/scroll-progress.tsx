"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

export function ScrollProgress() {
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  if (reducedMotion) return null;

  return (
    <>
      <motion.div
        className="fixed left-0 right-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-iar-teal via-iar-sky to-iar-teal-light"
        style={{ scaleX }}
      />
      <motion.div
        className="pointer-events-none fixed left-0 right-0 top-0 z-[59] h-1 origin-left bg-gradient-to-r from-iar-teal/40 via-iar-sky/30 to-transparent blur-sm"
        style={{ scaleX }}
      />
    </>
  );
}
