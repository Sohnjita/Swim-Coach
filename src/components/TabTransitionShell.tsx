"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

const EMERGE_TRANSITION = {
  duration: 0.6,
  ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number],
};

const variants = {
  submerged: { opacity: 0, y: 10, scale: 0.97, filter: "blur(14px)" },
  surfaced: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
};

/**
 * Wraps routed page content so switching tabs reads as the new page
 * emerging up out of the water to the surface (rising into focus from a
 * dim, blurred, submerged state) while the old page sinks back down and
 * out of view — rather than a curtain sliding up/down.
 */
export default function TabTransitionShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative h-full">
      <AnimatePresence initial={true}>
        <motion.div
          key={pathname}
          initial="submerged"
          animate="surfaced"
          exit="submerged"
          variants={variants}
          transition={EMERGE_TRANSITION}
          className="absolute inset-0 overflow-y-auto overscroll-contain"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
