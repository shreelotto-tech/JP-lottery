import type { ActiveTab, BetModifier, DrawResult, RangeGroup } from './types';

export const INITIAL_DRAW: DrawResult = {
  drawTime: '03:00:00 PM',
  drawDate: '2026-04-03',
  numbers: [
    1028, 1159, 1271, 1358, 1414, 1561, 1699, 1771, 1868, 1929,
    3016, 3125, 3223, 3336, 3403, 3513, 3683, 3756, 3859, 3907,
    5015, 5183, 5206, 5331, 5428, 5538, 5621, 5783, 5882, 5937,
  ],
};

// Each top-level range group maps to 4-digit series
// "10-19" -> 1000s, "30-39" -> 3000s, "50-59" -> 5000s
export const RANGE_GROUPS: RangeGroup[] = [
  {
    id: '10-19',
    label: '10-19',
    bg: '#8B4513',
    series: [
      { id: '1000-1099', label: '1000-1099', base: 1000, color: '#ffeb3b' },
      { id: '1100-1199', label: '1100-1199', base: 1100, color: '#00bcd4' },
      { id: '1200-1299', label: '1200-1299', base: 1200, color: '#ffc107' },
      { id: '1300-1399', label: '1300-1399', base: 1300, color: '#4caf50' },
      { id: '1400-1499', label: '1400-1499', base: 1400, color: '#ff5722' },
      { id: '1500-1599', label: '1500-1599', base: 1500, color: '#9c27b0' },
      { id: '1600-1699', label: '1600-1699', base: 1600, color: '#03a9f4' },
      { id: '1700-1799', label: '1700-1799', base: 1700, color: '#ff9800' },
      { id: '1800-1899', label: '1800-1899', base: 1800, color: '#8bc34a' },
      { id: '1900-1999', label: '1900-1999', base: 1900, color: '#f44336' },
    ],
  },
  {
    id: '30-39',
    label: '30-39',
    bg: '#2e7d32',
    series: [
      { id: '3000-3099', label: '3000-3099', base: 3000, color: '#ffeb3b' },
      { id: '3100-3199', label: '3100-3199', base: 3100, color: '#00bcd4' },
      { id: '3200-3299', label: '3200-3299', base: 3200, color: '#ffc107' },
      { id: '3300-3399', label: '3300-3399', base: 3300, color: '#4caf50' },
      { id: '3400-3499', label: '3400-3499', base: 3400, color: '#ff5722' },
      { id: '3500-3599', label: '3500-3599', base: 3500, color: '#9c27b0' },
      { id: '3600-3699', label: '3600-3699', base: 3600, color: '#03a9f4' },
      { id: '3700-3799', label: '3700-3799', base: 3700, color: '#ff9800' },
      { id: '3800-3899', label: '3800-3899', base: 3800, color: '#8bc34a' },
      { id: '3900-3999', label: '3900-3999', base: 3900, color: '#f44336' },
    ],
  },
  {
    id: '50-59',
    label: '50-59',
    bg: '#7b1fa2',
    series: [
      { id: '5000-5099', label: '5000-5099', base: 5000, color: '#ffeb3b' },
      { id: '5100-5199', label: '5100-5199', base: 5100, color: '#00bcd4' },
      { id: '5200-5299', label: '5200-5299', base: 5200, color: '#ffc107' },
      { id: '5300-5399', label: '5300-5399', base: 5300, color: '#4caf50' },
      { id: '5400-5499', label: '5400-5499', base: 5400, color: '#ff5722' },
      { id: '5500-5599', label: '5500-5599', base: 5500, color: '#9c27b0' },
      { id: '5600-5699', label: '5600-5699', base: 5600, color: '#03a9f4' },
      { id: '5700-5799', label: '5700-5799', base: 5700, color: '#ff9800' },
      { id: '5800-5899', label: '5800-5899', base: 5800, color: '#8bc34a' },
      { id: '5900-5999', label: '5900-5999', base: 5900, color: '#f44336' },
    ],
  },
];

export const ALL_SERIES = RANGE_GROUPS.flatMap((g) => g.series);

export const BET_MODIFIERS: BetModifier[] = ['EVEN', 'ODD', 'CP', 'FP'];

export const NAV_TABS: { label: ActiveTab; bg: string }[] = [
  { label: 'RESULT', bg: '#c2185b' },
  { label: 'ADVANCE-DRAW', bg: '#00897b' },
  { label: 'HISTORY', bg: '#546e7a' },
  { label: 'REFRESH', bg: '#607d8b' },
  { label: 'CANCEL', bg: '#d32f2f' },
];
