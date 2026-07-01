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
    <div
      className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-bg/85 px-4 pb-3 backdrop-blur-md"
      style={{ paddingTop: "calc(var(--safe-top) + 16px)" }}
    >
      <div>
        <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
        {subtitle && (
          <p className="text-sm text-text-secondary">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
