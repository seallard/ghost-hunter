export interface HeatmapCell {
  date: Date;
  count: number;
  isFuture: boolean;
}

export interface HeatmapWeek {
  cells: (HeatmapCell | null)[];
  monthLabel: string | null;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MS_PER_DAY = 86_400_000;

function utcMidnight(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * MS_PER_DAY);
}

export function dateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function buildHeatmap(
  counts: Map<string, number>,
  today: Date,
  days: number,
): HeatmapWeek[] {
  const todayUTC = utcMidnight(today);
  const dow = todayUTC.getUTCDay();
  const endSat = addDays(todayUTC, 6 - dow);
  const startSun = addDays(endSat, -days);
  const windowStart = addDays(todayUTC, -(days - 1));
  const numWeeks = Math.ceil((days + 1) / 7);

  const weeks: HeatmapWeek[] = [];
  let prevMonth: number | null = null;

  for (let w = 0; w < numWeeks; w++) {
    const cells: (HeatmapCell | null)[] = [];
    const weekStart = addDays(startSun, w * 7);
    for (let d = 0; d < 7; d++) {
      const cellDate = addDays(weekStart, d);
      if (cellDate.getTime() < windowStart.getTime()) {
        cells.push(null);
        continue;
      }
      const isFuture = cellDate.getTime() > todayUTC.getTime();
      cells.push({
        date: cellDate,
        count: isFuture ? 0 : (counts.get(dateKey(cellDate)) ?? 0),
        isFuture,
      });
    }
    const month = weekStart.getUTCMonth();
    const monthLabel =
      prevMonth === null || month !== prevMonth ? MONTHS[month] : null;
    prevMonth = month;
    weeks.push({ cells, monthLabel });
  }

  return weeks;
}

export function maxCount(weeks: HeatmapWeek[]): number {
  let max = 0;
  for (const week of weeks) {
    for (const cell of week.cells) {
      if (cell && !cell.isFuture && cell.count > max) max = cell.count;
    }
  }
  return max;
}

// Bucketing relative to the user's busiest day so the gradient stays
// readable whether they applied to 3 jobs in a day or 30. GitHub uses
// the same approach for its contribution graph.
export function intensity(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (max <= 1) return 4;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}
