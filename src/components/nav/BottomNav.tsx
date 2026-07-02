"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListChecks, Layers, CalendarDays, Trophy } from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/practices", label: "Log", icon: ListChecks },
  { href: "/sets", label: "Sets", icon: Layers },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/times", label: "Times", icon: Trophy },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <div className="pool-edge-bottom" />
      <div className="mx-auto flex h-16 max-w-md items-center">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className="flex flex-1 items-center justify-center"
            >
              <span
                className={cn(
                  "flex items-center justify-center rounded-full transition-all duration-200",
                  active
                    ? "btn-primary h-12 w-12"
                    : "h-9 w-9 border border-border-strong bg-bg-elevated-2/80",
                )}
              >
                <Icon
                  size={active ? 22 : 17}
                  strokeWidth={active ? 2.25 : 1.75}
                  className={active ? "text-accent-text" : "text-text-tertiary"}
                />
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
