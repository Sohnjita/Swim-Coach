import { cn } from "@/lib/cn";

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-xl border border-border bg-bg-elevated-2 p-1",
        className,
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm transition-colors",
            value === opt.value
              ? "bg-accent text-accent-text font-medium"
              : "text-text-secondary",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
