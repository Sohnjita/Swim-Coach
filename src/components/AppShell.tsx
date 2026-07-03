"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TABS } from "@/lib/tabs";
import { cn } from "@/lib/cn";
import TabTransitionShell from "./TabTransitionShell";

const FLAGS_HEIGHT = 16; // px, matches .flags-divider's height

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const navOuterRef = useRef<HTMLDivElement>(null);
  const [navHeight, setNavHeight] = useState(84);

  useEffect(() => {
    function update() {
      if (!navOuterRef.current) return;
      setNavHeight(navOuterRef.current.offsetHeight);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <>
      <div className="pool-edge-top" />
      <div
        className="fixed inset-x-0 z-20 flags-divider"
        style={{ top: "calc(var(--safe-top) + 4px)" }}
      />

      <div
        className="fixed inset-x-0 z-[1] overflow-hidden"
        style={{
          top: "calc(var(--safe-top) + 4px + 16px)",
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
        <div className="mx-auto flex max-w-md items-center py-2">
          {TABS.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <button
                key={href}
                type="button"
                onClick={() => !active && router.push(href)}
                aria-label={label}
                aria-pressed={active}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <span className="flex h-9 w-9 items-center justify-center">
                  <span className={cn("nav-mark", active && "nav-mark-active")} />
                </span>
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
        <div className="pool-edge-bottom" />
      </div>
    </>
  );
}
