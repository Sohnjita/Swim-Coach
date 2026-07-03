import type { ReactNode } from "react";

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
  return (
    <div
      className={`relative z-10 flex items-center px-4 pb-2 pt-1 ${leading ? "justify-between" : "justify-end"}`}
    >
      <h1 className="sr-only">
        {title}
        {subtitle ? ` — ${subtitle}` : ""}
      </h1>
      {leading}
      {action}
    </div>
  );
}
