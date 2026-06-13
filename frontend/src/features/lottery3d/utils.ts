import type { BetType3D, Filter3D } from './types';

export function getDisplayNumber(number: number, betType: BetType3D): string {
  const formatted = formatNumber3D(number);
  if (betType === 'FP') return `${formatted.slice(0, 2)}X`;
  if (betType === 'BP') return `X${formatted.slice(1)}`;
  if (betType === 'SP') return `${formatted[0]}X${formatted[2]}`;
  if (betType === 'AP') return formatted.slice(0, 2);
  return formatted;
}

export function completePairNumber(digits: string, betType: BetType3D): number {
  const d1 = parseInt(digits[0], 10);
  const d2 = parseInt(digits[1], 10);
  if (betType === 'FP') return d1 * 100 + d2 * 10;  // d1d20
  if (betType === 'BP') return d1 * 10 + d2;          // 0d1d2
  if (betType === 'SP') return d1 * 100 + d2;         // d10d2
  return d1 * 100 + d2 * 10;                          // AP: d1d20 (b1=d1, b2=d2 for matching)
}

export function formatNumber3D(n: number): string {
  return n.toString().padStart(3, '0');
}

export function getDigits(n: number): [number, number, number] {
  return [Math.floor(n / 100), Math.floor((n % 100) / 10), n % 10];
}

export function isTriple(n: number): boolean {
  const [d1, d2, d3] = getDigits(n);
  return d1 === d2 && d2 === d3;
}

export function isDuplicate(n: number): boolean {
  const [d1, d2, d3] = getDigits(n);
  return !isTriple(n) && (d1 === d2 || d2 === d3 || d1 === d3);
}

export function isSingle(n: number): boolean {
  const [d1, d2, d3] = getDigits(n);
  return d1 !== d2 && d2 !== d3 && d1 !== d3;
}

export function getBoxSubtype(n: number): 'triple' | 'duplicate' | 'single' {
  if (isTriple(n)) return 'triple';
  if (isDuplicate(n)) return 'duplicate';
  return 'single';
}

/** Generate 0-999 numbers whose digits are all in the given set, filtered by type. */
export function generate3DNumbers(
  selectedDigits: Set<number>,
  filters: Set<Filter3D>,
): number[] {
  const results: number[] = [];

  for (let n = 0; n <= 999; n++) {
    const [d1, d2, d3] = getDigits(n);
    if (!selectedDigits.has(d1) || !selectedDigits.has(d2) || !selectedDigits.has(d3)) continue;

    if (filters.size > 0) {
      const triple = isTriple(n);
      const dup    = isDuplicate(n);
      const single = isSingle(n);

      const pass =
        (filters.has('triple')    && triple) ||
        (filters.has('duplicate') && dup)    ||
        (filters.has('single')    && single);
      if (!pass) continue;
    }

    results.push(n);
  }
  return results;
}

/**
 * Build pool from 0-999 matching filter set (no filter => all).
 * Shuffle and take first `count`. Caps at pool size — never duplicates.
 */
export function generate3DLuckyPick(
  filters: Set<Filter3D>,
  count: number,
): number[] {
  const pool: number[] = [];
  for (let n = 0; n <= 999; n++) {
    if (filters.size === 0) { pool.push(n); continue; }
    const pass =
      (filters.has('triple')    && isTriple(n))    ||
      (filters.has('duplicate') && isDuplicate(n)) ||
      (filters.has('single')    && isSingle(n));
    if (pass) pool.push(n);
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

/** Set of unique digits (0-9) appearing across all given 3-digit numbers. */
export function uniqueDigitsOf(numbers: number[]): Set<number> {
  const set = new Set<number>();
  for (const n of numbers) {
    const [d1, d2, d3] = getDigits(n);
    set.add(d1); set.add(d2); set.add(d3);
  }
  return set;
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime12(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function getSlotTimes(): { slot: Date; label: string }[] {
  const now = new Date();
  const slots: { slot: Date; label: string }[] = [];
  // 8:45 AM to 9:45 PM in 15-min increments
  const start = new Date(now);
  start.setHours(8, 45, 0, 0);
  const end = new Date(now);
  end.setHours(21, 45, 0, 0);

  const cur = new Date(start);
  while (cur <= end) {
    slots.push({
      slot: new Date(cur),
      label: cur.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    });
    cur.setMinutes(cur.getMinutes() + 15);
  }
  return slots;
}

/** Returns the current 15-minute slot's scheduled end time and label. */
export function getCurrentSlotInfo(): { label: string; scheduledAt: Date; secondsLeft: number } {
  const now = new Date();
  const slots = getSlotTimes();

  for (let i = slots.length - 1; i >= 0; i--) {
    if (now >= slots[i].slot) {
      const end = new Date(slots[i].slot.getTime() + 15 * 60 * 1000);
      const secondsLeft = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
      return { label: slots[i].label, scheduledAt: end, secondsLeft };
    }
  }

  // Before first slot
  const firstEnd = new Date(slots[0].slot.getTime() + 15 * 60 * 1000);
  return { label: slots[0].label, scheduledAt: firstEnd, secondsLeft: 0 };
}
