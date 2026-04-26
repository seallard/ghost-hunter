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
