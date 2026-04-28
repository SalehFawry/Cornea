/** Format decimal hours as "Xh Ym" or "Y mins" */
export function formatWorkingHours(hoursDecimal: number | null | undefined): string {
  if (hoursDecimal == null || isNaN(hoursDecimal) || hoursDecimal <= 0) return "0 mins";
  const hours = Math.floor(hoursDecimal);
  let minutes = Math.round((hoursDecimal - hours) * 60);
  if (minutes >= 60) return `${hours + 1} hour${hours + 1 !== 1 ? "s" : ""}`;
  if (hours === 0) return `${minutes} mins`;
  if (minutes === 0) return `${hours} hour${hours !== 1 ? "s" : ""}`;
  return `${hours}h ${minutes}m`;
}

/** Format minutes as "Xm Ys" */
export function formatMinutes(mins: number | null | undefined): string {
  if (mins == null || isNaN(mins) || mins <= 0) return "N/A";
  const m = Math.floor(mins);
  const s = Math.round((mins - m) * 60);
  if (s > 0) return `${m}m ${s}s`;
  return `${m} minutes`;
}

/** Format seconds-from-midnight as "h:mm AM/PM" */
export function formatTimeAmPm(totalSeconds: number): string {
  let h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const amPm = h >= 12 ? "PM" : "AM";
  let displayH = h % 12;
  if (displayH === 0) displayH = 12;
  return `${displayH}:${String(m).padStart(2, "0")} ${amPm}`;
}

/** Convert camelCase/PascalCase to Title Case */
export function formatAlertType(alertType: string): string {
  return alertType.replace(/([A-Z])/g, " $1").trim();
}

/** Today as YYYY-MM-DD */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Parse a datetime string and return seconds from midnight */
export function toSecondsFromMidnight(dt: string | null): number | null {
  if (!dt) return null;
  const d = new Date(dt);
  if (isNaN(d.getTime())) return null;
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
}

/** Parse a time string "HH:MM:SS" and return minutes from midnight */
export function timeToMinutes(ts: string): number {
  const parts = ts.split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/** Convert total minutes to "HH:MM" string */
export function minutesToTimeStr(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Download data as CSV */
export function downloadCsv(data: Record<string, unknown>[], filename: string) {
  if (!Array.isArray(data) || !data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((h) => {
        const v = row[h];
        const s = v == null ? "" : String(v);
        return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

const CHART_COLORS = [
  "#0066CC", "#FFD700", "#800020", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16",
  "#f97316", "#6366f1", "#14b8a6", "#f43f5e", "#a855f7",
];

export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}
