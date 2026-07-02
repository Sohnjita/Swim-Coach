"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { SWIM_TRANSITION } from "@/lib/tabs";

const variants = {
  hidden: { clipPath: "inset(100% 0% 0% 0%)", opacity: 0.4 },
  visible: { clipPath: "inset(0% 0% 0% 0%)", opacity: 1 },
};

/**
 * Wraps routed page content so switching tabs reads as the active tab
 * dragging a curtain up from the bottom as it travels to the top (or
 * dropping it back down as it returns to rest) — the outgoing and
 * incoming pages animate concurrently, using the exact same transition as
 * the tab icon in <AppShell />, so content and icon move at the same pace.
 */
export default function TabTransitionShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative h-full">
      <AnimatePresence initial={true}>
        <motion.div
          key={pathname}
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={variants}
          transition={SWIM_TRANSITION}
          className="absolute inset-0 overflow-y-auto overscroll-contain"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
