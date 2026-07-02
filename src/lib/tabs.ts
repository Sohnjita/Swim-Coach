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
export const SWIM_TRANSITION = {
  duration: 0.5,
  ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number],
};
