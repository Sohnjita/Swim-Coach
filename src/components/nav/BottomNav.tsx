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
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg/90 backdrop-blur-md"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2"
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.25 : 1.75}
                className={cn(active ? "text-accent" : "text-text-tertiary")}
              />
              <span
                className={cn(
                  "text-[10px]",
                  active ? "text-accent font-medium" : "text-text-tertiary",
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
