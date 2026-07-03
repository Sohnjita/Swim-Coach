"use client";

import type { ReactNode } from "react";
import { useSetHeader } from "@/lib/headerBus";

/**
 * Publishes this page's icon-band content (back button, action icons, title
 * for a11y) into AppShell's fixed top band. Renders nothing itself — the
 * actual chrome lives above the scrollable content, between the pool edge
 * and the backstroke flags.
 */
export function PageHeader({
  title,
  subtitle,
  leading,
  action,
}: {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  action?: ReactNode;
}) {
  useSetHeader({
    title: subtitle ? `${title} — ${subtitle}` : title,
    leading,
    action,
  });
  return null;
}
