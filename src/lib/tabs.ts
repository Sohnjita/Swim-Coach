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

// Shared by both the traveling tab icon and the content reveal so the
// content pulls up/down with the tab, in lockstep, at the same pace.
export const SWIM_TRANSITION = {
  duration: 0.5,
  ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number],
};
