import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "accent" | "danger" | "warning";
}) {
  const toneClasses = {
    neutral: "bg-bg-elevated-2 text-text-secondary border-border",
    accent: "bg-accent-dim text-accent border-transparent",
    danger: "bg-danger/15 text-danger border-transparent",
    warning: "bg-warning/15 text-warning border-transparent",
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        toneClasses,
        className,
      )}
      {...props}
    />
  );
}
