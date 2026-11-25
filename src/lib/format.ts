const NB = " ";

export const zar = (n: number) =>
  "R" + NB + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NB);

export const zarK = (n: number) => {
  if (n >= 1e6) return "R" + NB + (n / 1e6).toFixed(2) + "m";
  if (n >= 1e3) return "R" + NB + (n / 1e3).toFixed(n < 1e5 ? 1 : 0) + "k";
  return zar(n);
};

/** axis ticks: clean and short */
export const zarAxis = (n: number) =>
  n >= 1e6 ? "R" + (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + "m" : n >= 1e3 ? "R" + Math.round(n / 1e3) + "k" : "R" + n;

export const pct = (n: number) => Math.round(n) + "%";
export const int = (n: number) => Math.round(n).toString();

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
export const monthStart = (d: Date, back = 0) => new Date(d.getFullYear(), d.getMonth() - back, 1);
export const mondayOf = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));
export const monthLabel = (d: Date) => MON[d.getMonth()];
export const dayName = (d: Date) => DAY[d.getDay()];

export const fmtDay = (s: string) => {
  const d = parse(s);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
};
/** near dates as a day, far ones with the year so they cannot read as past */
export const fmtSoon = (s: string) => {
  if (daysBetween(today(), s) < 150) return fmtDay(s);
  const d = parse(s);
  return `${MON[d.getMonth()]} ${d.getFullYear()}`;
};
export const fmtLong = (s: string) => {
  const d = parse(s);
  return `${DAY[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
};
export const fmtFull = (s: string) => {
  const d = parse(s);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
};

export const daysBetween = (a: string, b: string) =>
  Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);

export const today = () => iso(new Date());

export const relDay = (s: string) => {
  const n = daysBetween(today(), s);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
};

export const ago = (ms: number) => {
  const m = Math.max(1, Math.round((Date.now() - ms) / 60000));
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
};

export const hhmm = (h: number) =>
  `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;

export function downloadCsv(name: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const blob = new Blob(["﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
