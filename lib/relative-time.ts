const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["week", 7 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
  ["second", 1000],
];

export function relativeTime(date: Date | string, now: Date = new Date()) {
  const then = typeof date === "string" ? new Date(date) : date;
  const diff = then.getTime() - now.getTime();
  const abs = Math.abs(diff);

  for (const [unit, ms] of UNITS) {
    if (abs >= ms || unit === "second") {
      return rtf.format(Math.round(diff / ms), unit);
    }
  }
  return rtf.format(0, "second");
}

const SCHEDULED_DAY = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const SCHEDULED_TIME = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

export function formatScheduledAt(
  date: Date | string,
  now: Date = new Date(),
): string {
  const then = typeof date === "string" ? new Date(date) : date;
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const dayDiff = Math.round(
    (then.getTime() - startOfToday.getTime()) / 86_400_000,
  );

  const time = SCHEDULED_TIME.format(then);
  if (dayDiff === 0) return `Today, ${time}`;
  if (dayDiff === 1) return `Tomorrow, ${time}`;
  return `${SCHEDULED_DAY.format(then)}, ${time}`;
}

export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
