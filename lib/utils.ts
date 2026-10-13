export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Format an ISO date (YYYY-MM-DD) or Date in the given locale. Returns "" when invalid. */
export function formatDate(value: string | Date | null | undefined, locale = "es-MX"): string {
  if (!value) return "";
  const date =
    typeof value === "string"
      ? new Date(value.length === 10 ? `${value}T00:00:00` : value)
      : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatRuntime(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}