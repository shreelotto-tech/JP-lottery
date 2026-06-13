export type BetType3D = 'STR' | 'BOX' | 'FP' | 'BP' | 'SP' | 'AP';
export type Mode3D = 'A' | 'B' | 'C';
export type Filter3D = 'single' | 'duplicate' | 'triple';
export type ActiveTab3D = 'RESULT' | 'HISTORY' | 'CANCEL' | 'REFRESH' | 'ADVANCE DRAW';

export interface BetListEntry {
  id: string;          // local uuid for remove
  number: number;      // 0-999
  betType: BetType3D;
  mode: Mode3D;
  amount: number;
  pairDigits?: string; // raw 2-digit string for pair manual input (e.g. "34")
}

export interface Draw3D {
  id: string;
  draw_date: string;
  mode: Mode3D;
  status: 'open' | 'resulted';
  scheduled_at: string;
  result_number: number | null;
  timeslot_label?: string;
}

export interface DrawIds3D {
  A: string | null;
  B: string | null;
  C: string | null;
}

export interface Bet3DHistoryRow {
  bet_id: string;
  barcode: string | null;
  number: number | null;
  bet_type: string | null;
  amount: number | null;
  points_cost: number | null;
  status: string | null;
  payout: number | null;
  placed_at: string | null;
  draw_date: string | null;
  mode: string | null;
  slot_label: string | null;
  is_cancellable: boolean | null;
  is_claimable: boolean | null;
  receipt_url: string | null;
  win_receipt_url: string | null;
}
