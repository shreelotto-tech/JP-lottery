import type { BlockData, GridData } from './types';

export function createEmptyGrid(): GridData {
  const grid: GridData = {};
  for (let r = 0; r < 10; r++) {
    grid[r] = {};
    for (let c = 0; c < 10; c++) grid[r][c] = 0;
  }
  return grid;
}

export function createEmptyBlockData(): BlockData {
  const bd: BlockData = {};
  for (let r = 0; r < 10; r++) bd[r] = 0;
  return bd;
}

export function createEmptyColumnData(): Record<number, number> {
  const cd: Record<number, number> = {};
  for (let c = 0; c < 10; c++) cd[c] = 0;
  return cd;
}

export function randomDrawNumbers(): number[] {
  const nums: number[] = [];
  for (const [min, max] of [[1000, 1999], [3000, 3999], [5000, 5999]]) {
    const set = new Set<number>();
    while (set.size < 10) set.add(Math.floor(Math.random() * (max - min + 1)) + min);
    nums.push(...Array.from(set).sort((a, b) => a - b));
  }
  return nums;
}

export function formatTime12(d: Date): string {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${m}:${s} ${ampm}`;
}

export function formatDate(d: Date): string {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${days[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

export function formatSlotLabelAsRange(slotLabel: string | null, slotMinutes = 15): string {
  if (!slotLabel) return '--';

  // Keep existing range-like labels unchanged.
  if (slotLabel.includes('-') || slotLabel.toUpperCase().includes('TO')) {
    return slotLabel;
  }

  const match = slotLabel.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!match) return slotLabel;

  const hours12 = Number(match[1]);
  const minutes = Number(match[2]);
  const suffix = match[3].toUpperCase();

  if (hours12 < 1 || hours12 > 12 || minutes < 0 || minutes > 59) {
    return slotLabel;
  }

  const startHours24 = (hours12 % 12) + (suffix === 'PM' ? 12 : 0);
  const start = new Date(0);
  start.setUTCHours(startHours24, minutes, 0, 0);

  const end = new Date(start.getTime() + slotMinutes * 60 * 1000);

  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

export function formatBookingSlotFromPlacedAt(
  placedAt: string | null,
  slotMinutes = 15,
  fallbackSlotLabel: string | null = null
): string {
  if (!placedAt) {
    return formatSlotLabelAsRange(fallbackSlotLabel, slotMinutes);
  }

  const placed = new Date(placedAt);
  if (Number.isNaN(placed.getTime())) {
    return formatSlotLabelAsRange(fallbackSlotLabel, slotMinutes);
  }

  const start = new Date(placed);
  start.setSeconds(0, 0);
  start.setMinutes(Math.floor(start.getMinutes() / slotMinutes) * slotMinutes);

  const end = new Date(start.getTime() + slotMinutes * 60 * 1000);

  const formatter = new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}
