"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { TABS, SWIM_TRANSITION } from "@/lib/tabs";
import { cn } from "@/lib/cn";
import TabTransitionShell from "./TabTransitionShell";

const ICON_SIZE = 36; // px, matches h-9 w-9 — kept constant so descending
// never changes the icon's box size, which would throw off the symmetry math.
const ROW_TOP_PADDING = 8; // px, matches the row's py-2 top padding

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const navRef = useRef<HTMLDivElement>(null);
  const [navHeight, setNavHeight] = useState(84);
  const [descend, setDescend] = useState(0);

  useEffect(() => {
    function update() {
      if (!navRef.current) return;
      setNavHeight(navRef.current.offsetHeight);
      // The resting gap from the viewport top to an icon's top edge is
      // (resolved safe-area + edge cap) padding on the nav bar, plus the
      // row's own top padding. Deriving it from computed styles (rather
      // than measuring any one tab's rendered rect) keeps it stable
      // regardless of which tab happens to be active right now.
      const topPad = parseFloat(getComputedStyle(navRef.current).paddingTop) || 0;
      const restingTop = topPad + ROW_TOP_PADDING;
      setDescend(Math.max(0, window.innerHeight - 2 * restingTop - ICON_SIZE));
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
        ref={navRef}
        className="fixed inset-x-0 top-0 z-30"
        style={{ paddingTop: "calc(var(--safe-top) + 4px)" }}
      >
        <div className="mx-auto flex max-w-md items-start py-2">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            const descended = active && href !== "/";
            return (
              <button
                key={href}
                type="button"
                onClick={() => handleClick(href, active)}
                aria-label={label}
                aria-pressed={active}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <motion.span
                  animate={{ y: descended ? descend : 0 }}
                  transition={SWIM_TRANSITION}
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
                </motion.span>
                <span
                  className={cn(
                    "text-[10px] leading-none",
                    active ? "font-medium text-accent" : "text-text-tertiary",
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="fixed inset-x-0 z-[1] overflow-y-auto overscroll-contain"
        style={{ top: navHeight, bottom: navHeight }}
      >
        <TabTransitionShell>{children}</TabTransitionShell>
      </div>

      <div className="pool-edge-bottom" />
    </>
  );
}
