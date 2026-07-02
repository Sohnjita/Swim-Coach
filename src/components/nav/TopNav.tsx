"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TABS, SWIM_TRANSITION } from "@/lib/tabs";
import { cn } from "@/lib/cn";

const TOPBAR_OFFSET = 84; // approx resting distance from viewport top (see layout.tsx padding)
const BOTTOM_MARGIN = 28;

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [descend, setDescend] = useState(0);

  useEffect(() => {
    function update() {
      setDescend(Math.max(0, window.innerHeight - TOPBAR_OFFSET - BOTTOM_MARGIN));
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  function handleClick(href: string, active: boolean) {
    if (active && href !== "/") {
      router.push("/");
    } else if (!active) {
      router.push(href);
    }
  }

  return (
    <div
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
                animate={{ y: descended ? descend : 0, scale: active ? 1.2 : 1 }}
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
  );
}
