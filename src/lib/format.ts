export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDateLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatMonthLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
