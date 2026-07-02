import { Home, Trophy, ListChecks, TestTube, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface TabDef {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const TABS: TabDef[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/times", label: "Times", icon: Trophy },
  { href: "/practices", label: "Practices", icon: ListChecks },
  { href: "/analyze", label: "Analyze", icon: TestTube },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const SWIM_TRANSITION = {
  duration: 0.5,
  ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number],
};

export const CONTENT_TRANSITION = {
  duration: 0.28,
  ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number],
};
