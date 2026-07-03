"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TABS } from "@/lib/tabs";
import { cn } from "@/lib/cn";
import { HeaderBusProvider, useHeaderEntry } from "@/lib/headerBus";
import TabTransitionShell from "./TabTransitionShell";

const FLAGS_HEIGHT = 16; // px, matches .flags-divider's height

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <HeaderBusProvider>
      <AppShellBody>{children}</AppShellBody>
    </HeaderBusProvider>
  );
}

function AppShellBody({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const navOuterRef = useRef<HTMLDivElement>(null);
  const [navHeight, setNavHeight] = useState(84);
  const header = useHeaderEntry();

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

      {/* Icon band: mirrors the bottom nav, sitting between the pool edge
          cap and the top backstroke flags. Back button (leading) sits at
          the left, page actions (leading icons like sets/import/new, or
          copy/delete) at the right. */}
      <div
        className="fixed inset-x-0 z-30 flex items-end justify-between gap-2 px-2"
        style={{
          top: 0,
          height: navHeight,
          paddingTop: "calc(var(--safe-top) + 4px)",
          paddingBottom: 4,
        }}
      >
        <h1 className="sr-only">{header?.title}</h1>
        <div className="flex items-center gap-1">{header?.leading}</div>
        <div className="flex items-center gap-1">{header?.action}</div>
      </div>

      <div className="fixed inset-x-0 z-20 flags-divider" style={{ top: navHeight }} />

      <div
        className="fixed inset-x-0 z-[1] overflow-hidden"
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
        <div className="mx-auto flex max-w-md items-center py-2">
          {TABS.map(({ href, label, icon: Icon }) => {
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
                  <Icon size={22} strokeWidth={2} className={cn("nav-icon", active && "nav-icon-active")} />
                </span>
                <span
                  className={cn(
                    "text-[10px] leading-none",
                    active ? "font-medium text-white" : "text-text-tertiary",
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
