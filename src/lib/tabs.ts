import type { ComponentType } from "react";
import { Home, Clock, Settings } from "lucide-react";
import { FlaskBubblesIcon, LinesBulletsIcon } from "@/components/icons/CustomIcons";

export interface TabDef {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}

export const TABS: TabDef[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/times", label: "Times", icon: Clock },
  { href: "/practices", label: "Training", icon: LinesBulletsIcon },
  { href: "/analyze", label: "Analyze", icon: FlaskBubblesIcon },
  { href: "/settings", label: "Settings", icon: Settings },
];
