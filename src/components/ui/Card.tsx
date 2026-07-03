import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Plain content section — no box/border, just grouped text on the water background. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-xs font-semibold uppercase tracking-wide text-text-tertiary",
        className,
      )}
      {...props}
    />
  );
}
