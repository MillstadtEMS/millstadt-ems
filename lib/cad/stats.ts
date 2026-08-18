const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function blockOfHour(hour: number) {
  return hour >= 5 && hour <= 12 ? 0 : hour >= 13 && hour <= 20 ? 1 : 2;
}

/** Per-month 7 by 3 grid (day of week by operational time window). */
export function monthlyPeaks(rows: { dispatch_date: string; dispatch_time: string }[]) {
  const map = new Map<string, { key: string; label: string; year: number; grid: number[][]; total: number }>();
  for (const row of rows) {
    const dateMatch = String(row.dispatch_date || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!dateMatch) continue;
    const month = Number.parseInt(dateMatch[1], 10);
    const day = Number.parseInt(dateMatch[2], 10);
    const year = Number.parseInt(dateMatch[3], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    const date = new Date(year, month - 1, day);
    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) continue;
    const timeMatch = String(row.dispatch_time || "").match(/^(\d{1,2}):/);
    const hour = timeMatch ? Number.parseInt(timeMatch[1], 10) : -1;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: MONTH_LABELS[month - 1],
        year,
        grid: Array.from({ length: 7 }, () => [0, 0, 0]),
        total: 0,
      });
    }
    const aggregate = map.get(key)!;
    aggregate.total += 1;
    if (hour >= 0 && hour <= 23) aggregate.grid[date.getDay()][blockOfHour(hour)] += 1;
  }
  return Array.from(map.values()).sort((left, right) => left.key.localeCompare(right.key));
}
