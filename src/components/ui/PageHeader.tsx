import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative z-10 flex items-center justify-end px-4 pb-2 pt-1">
      <h1 className="sr-only">
        {title}
        {subtitle ? ` — ${subtitle}` : ""}
      </h1>
      {action}
    </div>
  );
}
