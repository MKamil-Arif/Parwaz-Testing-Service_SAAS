import { PKT_TIMEZONE } from "./constants";

type DecimalLike = { toString(): string } | number | string | null | undefined;

/** Converts a Prisma Decimal (or number/string) into a JS number. */
export function num(value: DecimalLike): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

export function formatPKR(value: DecimalLike, opts: { compact?: boolean } = {}): string {
  const n = num(value);
  if (opts.compact && Math.abs(n) >= 1000) {
    return `PKR ${new Intl.NumberFormat("en-PK", { notation: "compact", maximumFractionDigits: 1 }).format(n)}`;
  }
  return `PKR ${new Intl.NumberFormat("en-PK", { maximumFractionDigits: n % 1 === 0 ? 0 : 2 }).format(n)}`;
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("en-PK", { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value);
}

export function formatPercent(value: number, digits = 1): string {
  return `${formatNumber(value, digits)}%`;
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", { timeZone: PKT_TIMEZONE, day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: PKT_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(d));
}

export function formatTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", { timeZone: PKT_TIMEZONE, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(d));
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/** Pakistan Standard Time is UTC+5 all year (no daylight saving). */
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** Date → "YYYY-MM-DDTHH:mm" in PKT, for <input type="datetime-local">. */
export function toPKTInput(d: Date | null | undefined): string {
  if (!d) return "";
  return new Date(d.getTime() + PKT_OFFSET_MS).toISOString().slice(0, 16);
}

/** Date → "YYYY-MM-DD" (calendar date), for <input type="date">. */
export function toDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

/** "YYYY-MM-DDTHH:mm" entered in PKT → UTC Date. */
export function fromPKTInput(value: string): Date {
  return new Date(`${value}:00+05:00`);
}

/** Age in whole years on a given date. */
export function ageOn(dob: Date, on: Date = new Date()): number {
  let age = on.getUTCFullYear() - dob.getUTCFullYear();
  const m = on.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && on.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}

/** Privacy-safe display name, e.g. "Ayesha K.". */
export function initialsName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Student";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export function publicName(fullName: string, mode: string | null | undefined): string {
  return mode === "FULL" ? fullName : initialsName(fullName);
}

export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "RP";
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${formatNumber(n)} ${n === 1 ? one : many}`;
}
