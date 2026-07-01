import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm" | "icon";

const variantClasses: Record<Variant, string> = {
  primary: "btn-primary font-medium",
  secondary: "btn-secondary text-text-primary",
  ghost: "text-text-secondary active:opacity-70",
  danger: "btn-danger",
};

const sizeClasses: Record<Size, string> = {
  md: "h-11 px-4 text-sm",
  sm: "h-9 px-3 text-xs",
  icon: "h-10 w-10",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl transition-[filter,opacity] disabled:opacity-40",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
