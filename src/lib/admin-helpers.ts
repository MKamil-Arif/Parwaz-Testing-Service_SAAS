// Small helpers shared by admin list pages.
export const PAGE_SIZE = 25;

export function pageParam(v: string | undefined): number {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function skipTake(page: number, size = PAGE_SIZE) {
  return { skip: (page - 1) * size, take: size };
}

/** Days between two dates as YYYY-MM-DD keys in Pakistan time. */
export function pktDayKey(d: Date): string {
  return new Date(d.getTime() + 5 * 3600 * 1000).toISOString().slice(0, 10);
}

export function lastNDays(n: number): string[] {
  const out: string[] = [];
  const now = Date.now();
  for (let i = n - 1; i >= 0; i--) out.push(pktDayKey(new Date(now - i * 86400_000)));
  return out;
}

export function shortDay(key: string): string {
  const [, m, d] = key.split("-");
  return `${Number(d)} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m) - 1]}`;
}

export function monthKey(d: Date): string {
  return pktDayKey(d).slice(0, 7);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m) - 1]} ${y.slice(2)}`;
}
