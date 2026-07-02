"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { TABS, SWIM_TRANSITION } from "@/lib/tabs";
import { cn } from "@/lib/cn";
import TabTransitionShell from "./TabTransitionShell";

const UNIT_HEIGHT = 52; // px, icon(36) + gap(4) + label(~12) — the whole traveling unit
const ROW_BOTTOM_PADDING = 8; // px, matches the row's py-2 bottom padding
const CAP_HEIGHT = 4; // px, matches .pool-edge-bottom's height
const FLAGS_HEIGHT = 16; // px, matches .flags-divider's height

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const navOuterRef = useRef<HTMLDivElement>(null);
  const [navHeight, setNavHeight] = useState(84);
  const [ascend, setAscend] = useState(0);

  useEffect(() => {
    function update() {
      if (!navOuterRef.current) return;
      setNavHeight(navOuterRef.current.offsetHeight);
      // Gap from the viewport bottom to the resting unit's near edge: the
      // outer container's own (safe-area-aware) bottom padding, plus the
      // pool-edge cap, plus the row's own bottom padding.
      const bottomPad = parseFloat(getComputedStyle(navOuterRef.current).paddingBottom) || 0;
      const restGap = bottomPad + CAP_HEIGHT + ROW_BOTTOM_PADDING;
      setAscend(Math.max(0, window.innerHeight - 2 * restGap - UNIT_HEIGHT));
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  function handleClick(href: string, active: boolean) {
    if (active && href !== "/") router.push("/");
    else if (!active) router.push(href);
  }

  return (
    <>
      <div className="pool-edge-top" />
      <div
        className="fixed inset-x-0 z-20 flags-divider"
        style={{ top: navHeight }}
      />

      <div
        className="fixed inset-x-0 z-[1] overflow-y-auto overscroll-contain"
        style={{
          top: navHeight + FLAGS_HEIGHT,
          bottom: navHeight + FLAGS_HEIGHT,
        }}
      >
        <TabTransitionShell>{children}</TabTransitionShell>
      </div>

      <div
        className="fixed inset-x-0 z-20 flags-divider"
        style={{ bottom: navHeight }}
      />

      <div
        ref={navOuterRef}
        className="fixed inset-x-0 bottom-0 z-30"
        style={{ paddingBottom: "var(--safe-bottom)" }}
      >
        <div className="mx-auto flex max-w-md items-start py-2">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            const traveled = active;
            return (
              <button
                key={href}
                type="button"
                onClick={() => handleClick(href, active)}
                aria-label={label}
                aria-pressed={active}
                className="relative flex flex-1 items-center justify-center"
              >
                <motion.div
                  initial={{ y: 0 }}
                  animate={{ y: traveled ? -ascend : 0 }}
                  transition={SWIM_TRANSITION}
                  className="flex flex-col items-center gap-1"
                >
                  <span
                    className={cn(
                      "z-10 flex h-9 w-9 items-center justify-center rounded-full",
                      active ? "buoy-active" : "buoy-inactive",
                    )}
                  >
                    <Icon
                      size={active ? 18 : 15}
                      strokeWidth={active ? 1.5 : 1.25}
                      className={active ? "text-accent-text" : "text-text-tertiary"}
                    />
                  </span>
                  <span
                    className={cn(
                      "text-[10px] leading-none",
                      active ? "font-medium text-accent" : "text-text-tertiary",
                    )}
                  >
                    {label}
                  </span>
                </motion.div>

                {traveled && (
                  <span
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary/60" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="pool-edge-bottom" />
      </div>
    </>
  );
}
