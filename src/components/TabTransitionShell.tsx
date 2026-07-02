"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CONTENT_TRANSITION } from "@/lib/tabs";

const variants = {
  hidden: { clipPath: "inset(100% 0% 0% 0%)", opacity: 0.4 },
  visible: { clipPath: "inset(0% 0% 0% 0%)", opacity: 1 },
};

/**
 * Wraps routed page content so switching tabs reads as a curtain being
 * pulled up from the bottom (or dropped back down) rather than an
 * instant swap — synced with the active tab's "swim" travel in <AppShell />.
 */
export default function TabTransitionShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={variants}
        transition={CONTENT_TRANSITION}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
