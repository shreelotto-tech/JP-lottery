export interface BetEntry {
  number: number;
  quantity: number;
  barcode?: string;
}

export interface DrawResult {
  drawTime: string;
  drawDate: string;
  numbers: number[];
}

export type BetModifier = 'EVEN' | 'ODD' | 'CP' | 'FP';
export type ActiveTab = 'RESULT' | 'ADVANCE-DRAW' | 'HISTORY' | 'REFRESH' | 'CANCEL';

export type GridData = Record<number, Record<number, number>>;
export type BlockData = Record<number, number>;

export interface SeriesItem {
  id: string;
  label: string;
  base: number;
  color: string;
}

export interface RangeGroup {
  id: string;
  label: string;
  bg: string;
  series: SeriesItem[];
}
