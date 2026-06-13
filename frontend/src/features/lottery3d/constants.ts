import type { ActiveTab3D, BetType3D, Mode3D } from './types';

export const RATES_3D = [10, 20, 30, 40, 50, 100, 200] as const;

export const BET_TYPES_3D: BetType3D[] = ['BOX', 'STR', 'FP', 'BP', 'SP', 'AP'];

export const MODES_3D: Mode3D[] = ['A', 'B', 'C'];

export const MODE_COLORS: Record<Mode3D, string> = {
  A: '#22aa22',
  B: '#cc2222',
  C: '#2266cc',
};

export const PAYOUT_MULTIPLIERS: Record<string, number> = {
  STR:              900,
  BOX_duplicate:    300,
  BOX_single:       150,
  FP:               90,
  BP:               90,
  SP:               90,
  AP:               30,
};

export const NAV_TABS_3D: { label: ActiveTab3D; bg: string }[] = [
  { label: 'REFRESH', bg: '#e91e63' },
  { label: 'RESULT',  bg: '#009688' },
  { label: 'HISTORY', bg: '#9c27b0' },
  { label: 'CANCEL',  bg: '#f44336' },
  { label: 'ADVANCE DRAW', bg: '#1565c0' },
];
