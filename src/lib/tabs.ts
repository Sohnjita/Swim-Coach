import { Home, Clock, Settings } from "lucide-react";
import type { ComponentType } from "react";
import { FlaskBubblesIcon, LinesBulletsIcon } from "@/components/icons/CustomIcons";

export interface TabIconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export interface TabDef {
  href: string;
  label: string;
  icon: ComponentType<TabIconProps>;
}

export const TABS: TabDef[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/times", label: "Times", icon: Clock },
  { href: "/practices", label: "Practices", icon: LinesBulletsIcon },
  { href: "/analyze", label: "Analyze", icon: FlaskBubblesIcon },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Shared by both the traveling tab icon and the content reveal so the
// content pulls up/down with the tab, in lockstep, at the same pace.
// A gentle spring (no overshoot) reads as a smooth glide rather than a
// snappy slide.
export const SWIM_TRANSITION = {
  type: "spring" as const,
  stiffness: 160,
  damping: 24,
  mass: 1,
};
