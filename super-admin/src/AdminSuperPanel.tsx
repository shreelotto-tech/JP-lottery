import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './lib/supabase';

interface SeriesConfig {
  label: string;
  base: number;
  color: string;
}

interface Props {
  currentDrawId: string;
  series: SeriesConfig[];
}

function display3DNumber(number: number, betType: string): string {
  const s = String(number).padStart(3, '0');
  if (betType === 'FP') return `${s[0]}${s[1]}X`;
  if (betType === 'BP') return `X${s[1]}${s[2]}`;
  if (betType === 'SP') return `${s[0]}X${s[2]}`;
  if (betType === 'AP') return `${s[0]}${s[1]}`;
  return s;
}

interface BetAggData {
  number: number;
  bet_type: string;
  total_qty: number;
  bet_count: number;
}

interface DrawInfo {
  id: string;
  draw_date: string;
  scheduled_at: string;
  status: string;
  timeslot_label?: string;
  published_at?: string | null;
  pending_result_numbers?: number[] | null;
}

function computeProjectedWinning2D(
  betData: Record<string, BetAggData[]>,
  effectiveNumbers: Record<string, number[]>
): { projectedWinning: number; totalPool: number } {
  const allResults: number[] = Object.values(effectiveNumbers).flat().filter(n => n > 0);
  const allResults_last3 = allResults.map(n => n % 1000);

  let totalPool = 0;
  let totalWinningStakes = 0;

  for (const bet of Object.values(betData).flat()) {
    const cost = bet.total_qty * 2;
    totalPool += cost;

    let isWinner = false;
    if (bet.bet_type === '4D') {
      isWinner = allResults.includes(bet.number);
    } else if (bet.bet_type === '3D') {
      isWinner = allResults_last3.includes(bet.number % 1000);
    } else if (bet.bet_type === 'EVEN') {
      isWinner = bet.number % 2 === 0 && allResults.includes(bet.number);
    } else if (bet.bet_type === 'ODD') {
      isWinner = bet.number % 2 !== 0 && allResults.includes(bet.number);
    } else if (['CP', 'FP', '12D'].includes(bet.bet_type)) {
      isWinner = allResults.includes(bet.number);
    }

    if (isWinner) totalWinningStakes += cost * 90;
  }

  return {
    projectedWinning: totalWinningStakes,
    totalPool,
  };
}

// 80/20 algorithm: top 8 slots (by bet volume) use the most-bet number in that slot's box;
// bottom 2 slots get a random number. Box constraint (prefix rule) is always respected.
const generateSmartNumbers = (base: number, slotBets: BetAggData[]): number[] => {
  const prefixStart = Math.floor(base / 100); // 1000→10, 3000→30, 5000→50

  const slotData: { topNumber: number | null; volume: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const prefix = prefixStart + i;
    const candidates = slotBets
      .filter(b => b.number >= prefix * 100 + 1 && b.number <= prefix * 100 + 99)
      .sort((a, b) => b.total_qty - a.total_qty);
    slotData.push({
      topNumber: candidates[0]?.number ?? null,
      volume: candidates[0]?.total_qty ?? 0,
    });
  }

  // Sort slot indices by volume descending; top 8 use popular bet, bottom 2 are random
  const sortedIdx = Array.from({ length: 10 }, (_, i) => i)
    .sort((a, b) => slotData[b].volume - slotData[a].volume);
  const popularSlots = new Set(sortedIdx.slice(0, 8));

  return Array.from({ length: 10 }, (_, i) => {
    const prefix = prefixStart + i;
    if (popularSlots.has(i) && slotData[i].topNumber !== null) {
      return slotData[i].topNumber!;
    }
    return prefix * 100 + Math.floor(Math.random() * 99) + 1;
  });
};

const generate2DSafeNumbers = (base: number, slotBets: BetAggData[]): number[] => {
  const prefixStart = Math.floor(base / 100);
  const betMap = new Map(slotBets.map((b) => [b.number, b.total_qty]));
  return Array.from({ length: 10 }, (_, i) => {
    const prefix = prefixStart + i;
    const zeroBet: number[] = [];
    for (let n = prefix * 100 + 1; n <= prefix * 100 + 99; n++) {
      if (!betMap.has(n)) zeroBet.push(n);
    }
    if (zeroBet.length > 0) return zeroBet[Math.floor(Math.random() * zeroBet.length)];
    let minQty = Infinity, minNum = prefix * 100 + 1;
    for (let n = prefix * 100 + 1; n <= prefix * 100 + 99; n++) {
      const qty = betMap.get(n) ?? 0;
      if (qty < minQty) { minQty = qty; minNum = n; }
    }
    return minNum;
  });
};

function computeProjected3DPayout(
  resultNum: number,
  bets: { number: number; bet_type: string; total_amt: number }[]
): number {
  const r1 = Math.floor(resultNum / 100);
  const r2 = Math.floor((resultNum % 100) / 10);
  const r3 = resultNum % 10;
  const rSorted = [r1, r2, r3].sort().join(',');

  let totalPayout = 0;
  for (const bet of bets) {
    const b1 = Math.floor(bet.number / 100);
    const b2 = Math.floor((bet.number % 100) / 10);
    const b3 = bet.number % 10;
    const bSorted = [b1, b2, b3].sort().join(',');

    let multiplier = 0;
    switch (bet.bet_type) {
      case 'STR':
        if (bet.number === resultNum) multiplier = 900;
        break;
      case 'BOX':
        if (bSorted === rSorted) {
          const hasDup = b1 === b2 || b2 === b3 || b1 === b3;
          multiplier = hasDup ? 300 : 150;
        }
        break;
      case 'FP':
        if (Math.floor(bet.number / 10) === Math.floor(resultNum / 10)) multiplier = 90;
        break;
      case 'BP':
        if (bet.number % 100 === resultNum % 100) multiplier = 90;
        break;
      case 'SP':
        if (b1 === r1 && b3 === r3) multiplier = 90;
        break;
      case 'AP':
        if ((b1===r1&&b2===r2)||(b1===r1&&b2===r3)||(b1===r2&&b2===r3)) multiplier = 30;
        break;
    }
    totalPayout += bet.total_amt * multiplier;
  }
  return totalPayout;
}

// For 3D: pick a number (000-999) where projected payout stays within 80% of pool
const generate3DSmartNumber = (bets: { number: number; bet_type: string; total_amt: number }[]): number => {
  const totalPool = bets.reduce((s, b) => s + b.total_amt, 0);
  const cap = Math.floor(totalPool * 0.80);

  for (let attempt = 0; attempt < 500; attempt++) {
    const n = Math.floor(Math.random() * 1000);
    if (computeProjected3DPayout(n, bets) <= cap) return n;
  }

  // Fallback: exhaustive scan for the globally safest number
  let best = 0, bestPayout = Infinity;
  for (let n = 0; n < 1000; n++) {
    const p = computeProjected3DPayout(n, bets);
    if (p < bestPayout) { bestPayout = p; best = n; }
  }
  return best;
};

const formatSlotLabelAsRange = (slotLabel: string | undefined, slotMinutes = 15): string => {
  if (!slotLabel) return '--';

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

  return formatter.format(end);
};

const AdminSuperPanel: React.FC<Props> = ({ currentDrawId, series }) => {
  const [gameMode, setGameMode] = useState<'2D' | '3D'>('2D');

  const [drawInfo, setDrawInfo] = useState<DrawInfo | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(9999);
  const [isLocked, setIsLocked] = useState(false);
  const [isEditable, setIsEditable] = useState(false);
  const [betData, setBetData] = useState<Record<string, BetAggData[]>>({});
  const [expandedSeries, setExpandedSeries] = useState<Record<string, boolean>>({});

  // 10 auto-generated numbers per series
  const [autoGeneratedNumbers, setAutoGeneratedNumbers] = useState<Record<string, number[]>>({});
  // Overrides keyed by seriesBase_index (e.g. "1000_0")
  const [overrides, setOverrides] = useState<Record<string, string>>({});


  // ── Save status tracking ──
  const [saveStatus2d, setSaveStatus2d] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveStatus2dTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveStatus3d, setSaveStatus3d] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({ A: 'idle', B: 'idle', C: 'idle' });

  // ── 3D state ────────────────────────────────────────────────────────────────
  interface Draw3DInfo { id: string; mode: string; draw_date: string; scheduled_at: string; status: string; published_at: string | null; result_number: number | null; pending_result_number: number | null; skip_cap_enforcement?: boolean; timeslot_label?: string; }
  const [draws3d, setDraws3d] = useState<Draw3DInfo[]>([]);
  const [bets3d, setBets3d] = useState<Record<string, { number: number; bet_type: string; total_amt: number; bet_count: number }[]>>({});
  const [results3d, setResults3d] = useState<Record<string, string>>({ A: '', B: '', C: '' });
  const [autoGen3d, setAutoGen3d] = useState<Record<string, boolean>>({ A: false, B: false, C: false });
  const generated3dRef = useRef<Record<string, boolean>>({ A: false, B: false, C: false });
  const [countdown3d, setCountdown3d] = useState<number>(9999);

  const savePending2D = useCallback(async (autoNums: Record<string, number[]>, ovs: Record<string, string>) => {
    if (!currentDrawId) return false;
    setSaveStatus2d('saving');
    const merged: number[] = [];
    for (const s of series) {
      for (let i = 0; i < 10; i++) {
        const ov = ovs[`${s.base}_${i}`];
        merged.push(ov !== undefined && ov !== '' ? parseInt(ov, 10) : autoNums[s.base]?.[i] ?? 0);
      }
    }
    const { error } = await supabase.rpc('save_pending_2d', { p_draw_id: currentDrawId, p_values: merged });
    if (error) {
      console.error('Failed to save 2D pending results:', error);
      setSaveStatus2d('error');
      return false;
    }
    setSaveStatus2d('saved');
    if (saveStatus2dTimer.current) clearTimeout(saveStatus2dTimer.current);
    saveStatus2dTimer.current = setTimeout(() => setSaveStatus2d('idle'), 3000);
    return true;
  }, [series, currentDrawId]);

  const setDbCapOverride = useCallback(async (skip: boolean) => {
    if (!currentDrawId) return;
    await supabase.rpc('admin_set_cap_override', { p_draw_id: currentDrawId, p_skip: skip });
  }, [currentDrawId]);

  const setDb3DCapOverride = useCallback(async (drawId: string, skip: boolean) => {
    await supabase.rpc('admin_set_3d_cap_override', { p_draw_id: drawId, p_skip: skip });
  }, []);

  const savePending3D = useCallback(async (drawId: string, value: number, mode?: string) => {
    if (mode) setSaveStatus3d(p => ({ ...p, [mode]: 'saving' }));
    const { error } = await supabase.rpc('save_pending_3d', { p_draw_id: drawId, p_value: value });
    if (error) {
      console.error('Failed to save 3D pending result:', error);
      if (mode) setSaveStatus3d(p => ({ ...p, [mode]: 'error' }));
      return false;
    }
    if (mode) {
      setSaveStatus3d(p => ({ ...p, [mode]: 'saved' }));
      setTimeout(() => setSaveStatus3d(p => ({ ...p, [mode]: 'idle' })), 3000);
    }
    return true;
  }, []);

  const handleManualSave2D = useCallback(async () => {
    await savePending2D(autoGeneratedNumbers, overrides);
  }, [savePending2D, autoGeneratedNumbers, overrides]);

  const handleManualSave3DAll = useCallback(async () => {
    for (const mode of ['A', 'B', 'C'] as const) {
      const draw = draws3d.find(d => d.mode === mode);
      if (!draw || draw.published_at) continue;
      const v = results3d[mode];
      if (v === '') continue;
      const n = parseInt(v, 10);
      if (!isNaN(n) && n >= 0 && n <= 999) {
        await savePending3D(draw.id, n, mode);
      }
    }
  }, [draws3d, results3d, savePending3D]);

  const fetch3DDraws = useCallback(async () => {
    const { data: rpcData } = await supabase.rpc('get_or_create_current_3d_draws');

    // Use returned draw IDs to pin query to exactly the current slot
    const currentDrawIds: string[] = rpcData && typeof rpcData === 'object' && !('error' in (rpcData as object))
      ? Object.values(rpcData as Record<string, string>).filter(Boolean)
      : [];

    if (currentDrawIds.length === 0) {
      setDraws3d([]);
      return;
    }

    const { data } = await supabase
      .from('draws_3d')
      .select('id, mode, draw_date, scheduled_at, status, published_at, result_number, pending_result_number, skip_cap_enforcement, draw_timeslots(label)')
      .in('id', currentDrawIds);  // current slot only, no status filter so published draws still show

    if (data) {
      const mapped = (data as Record<string, unknown>[]).map((r) => ({
        id: r.id as string,
        mode: r.mode as string,
        draw_date: r.draw_date as string,
        scheduled_at: r.scheduled_at as string,
        status: r.status as string,
        published_at: r.published_at as string | null,
        result_number: r.result_number as number | null,
        pending_result_number: r.pending_result_number as number | null,
        skip_cap_enforcement: r.skip_cap_enforcement as boolean | undefined,
        timeslot_label: (r.draw_timeslots as { label?: string } | null)?.label,
      }));
      setDraws3d(mapped);

      if (mapped.length > 0) {
        const target = new Date(mapped[0].scheduled_at).getTime();
        const diff = Math.max(0, Math.floor((target - Date.now()) / 1000));
        setCountdown3d(diff);
      }
    }
  }, []);

  const fetch3DBets = useCallback(async () => {
    for (const draw of draws3d) {
      const { data } = await supabase.rpc('admin_get_3d_bets_for_draw', { p_draw_id: draw.id });
      if (data) {
        setBets3d((prev) => ({ ...prev, [draw.mode]: data as { number: number; bet_type: string; total_amt: number; bet_count: number }[] }));
      }
    }
  }, [draws3d]);

  useEffect(() => {
    if (gameMode !== '3D') return;
    fetch3DDraws();
    const id = setInterval(fetch3DDraws, 15000);
    return () => clearInterval(id);
  }, [gameMode, fetch3DDraws]);

  useEffect(() => {
    if (gameMode !== '3D' || draws3d.length === 0) return;
    fetch3DBets();
    const id = setInterval(fetch3DBets, 10000);
    return () => clearInterval(id);
  }, [gameMode, draws3d, fetch3DBets]);

  useEffect(() => {
    if (gameMode !== '3D') return;
    (['A', 'B', 'C'] as const).forEach((mode) => {
      const draw = draws3d.find((d) => d.mode === mode);
      if (draw?.skip_cap_enforcement) return; // admin override active — respect their choice
      const modeBets = bets3d[mode] ?? [];
      if (modeBets.length === 0) return;
      const currentResult = results3d[mode];
      if (!currentResult || currentResult === '') return;
      const resultNum = parseInt(currentResult, 10);
      if (isNaN(resultNum)) return;
      const totalPool = modeBets.reduce((s, b) => s + b.total_amt, 0);
      const cap = Math.floor(totalPool * 0.80);
      const projected = computeProjected3DPayout(resultNum, modeBets);
      if (projected > cap) {
        const n = generate3DSmartNumber(modeBets);
        const padded = String(n).padStart(3, '0');
        setResults3d((p) => ({ ...p, [mode]: padded }));
        setAutoGen3d((p) => ({ ...p, [mode]: true }));
        if (draw) {
          try { localStorage.setItem(`3d_result_${draw.id}`, padded); } catch {}
          savePending3D(draw.id, n, mode);
        }
      }
    });
  }, [bets3d, gameMode, draws3d]);

  useEffect(() => {
    if (draws3d.length === 0) return;
    const target = new Date(draws3d[0].scheduled_at).getTime();
    const id = setInterval(() => {
      setCountdown3d(Math.max(0, Math.floor((target - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [draws3d]);

  // Reset auto-generation state when draw IDs change (new timeslot cycle starts)
  const draws3dIdsKey = draws3d.map((d) => d.id).sort().join(',');
  useEffect(() => {
    if (draws3d.length === 0) return;
    generated3dRef.current = { A: false, B: false, C: false };
    setResults3d({ A: '', B: '', C: '' });
    setAutoGen3d({ A: false, B: false, C: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draws3dIdsKey]);

  // Auto-generate 3D numbers once per mode; restore from DB if pending value exists
  useEffect(() => {
    if (gameMode !== '3D') return;
    (['A', 'B', 'C'] as const).forEach((mode) => {
      if (generated3dRef.current[mode]) return;
      const draw = draws3d.find((d) => d.mode === mode);
      if (!draw) return;

      // Tier 1: DB has value (authoritative)
      if (draw.pending_result_number !== null && draw.pending_result_number !== undefined) {
        const padded = String(draw.pending_result_number).padStart(3, '0');
        setResults3d((p) => ({ ...p, [mode]: padded }));
        setAutoGen3d((p) => ({ ...p, [mode]: false }));
        generated3dRef.current[mode] = true;
        try { localStorage.setItem(`3d_result_${draw.id}`, padded); } catch {}
        return;
      }

      // Tier 2: localStorage has value (DB write may have raced/failed)
      try {
        const saved = localStorage.getItem(`3d_result_${draw.id}`);
        if (saved !== null) {
          const n = parseInt(saved, 10);
          if (!isNaN(n) && n >= 0 && n <= 999) {
            const padded = String(n).padStart(3, '0');
            setResults3d((p) => ({ ...p, [mode]: padded }));
            setAutoGen3d((p) => ({ ...p, [mode]: false }));
            generated3dRef.current[mode] = true;
                savePending3D(draw.id, n);
            return;
          }
        }
      } catch {}

      // Tier 3: First-ever load — generate fresh
      if (bets3d[mode] === undefined) return;
      const n = generate3DSmartNumber(bets3d[mode] ?? []);
      const padded = String(n).padStart(3, '0');
      setResults3d((p) => ({ ...p, [mode]: padded }));
      setAutoGen3d((p) => ({ ...p, [mode]: true }));
      generated3dRef.current[mode] = true;
      try { localStorage.setItem(`3d_result_${draw.id}`, padded); } catch {}
      savePending3D(draw.id, n);
      setDb3DCapOverride(draw.id, false);
    });
  }, [bets3d, gameMode, draws3d, savePending3D]);

  const fmt3DSecs = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  // 1. Fetch Draw Info
  useEffect(() => {
    const fetchDraw = async () => {
      const { data, error } = await supabase
        .from('draws')
        .select('draw_date, scheduled_at, status, published_at, pending_result_numbers, draw_timeslots(label)')
        .eq('id', currentDrawId)
        .single();

      if (error) {
        console.error('Error fetching draw:', error);
      } else if (data) {
        setDrawInfo({
          id: currentDrawId,
          draw_date: data.draw_date,
          scheduled_at: data.scheduled_at,
          status: data.status,
          // @ts-ignore - joined table data
          timeslot_label: data.draw_timeslots?.label,
          published_at: data.published_at,
          pending_result_numbers: data.pending_result_numbers,
        });
      }
    };
    fetchDraw();
  }, [currentDrawId]);

  // 2. Countdown Timer & Lock Trigger
  useEffect(() => {
    if (!drawInfo?.scheduled_at) return;

    const target = new Date(drawInfo.scheduled_at).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diffSecs = Math.max(0, Math.floor((target - now) / 1000));
      setTimeRemaining(diffSecs);
      
      const locked = diffSecs <= 30 && diffSecs > 0 && !drawInfo.published_at;
      setIsLocked(locked);
      setIsEditable(diffSecs > 0 && !drawInfo.published_at);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [drawInfo]);

  // 3. Generate smart numbers (80/20) as soon as draw info + bet data are available
  useEffect(() => {
    if (!drawInfo || drawInfo.published_at) return;
    if (Object.keys(betData).length === 0) return;
    if (Object.keys(autoGeneratedNumbers).length > 0) return; // already generated, don't overwrite

    // Tier 1: DB has values (authoritative)
    const pending = drawInfo.pending_result_numbers;
    if (pending && pending.length === series.length * 10) {
      const restored: Record<string, number[]> = {};
      series.forEach((s, si) => {
        restored[s.base] = pending.slice(si * 10, (si + 1) * 10);
      });
      setAutoGeneratedNumbers(restored);
      try { localStorage.setItem(`2d_nums_${currentDrawId}`, JSON.stringify(restored)); } catch {}
      return;
    }

    // Tier 2: localStorage has values (DB save may have raced/failed on previous load)
    try {
      const savedNums = localStorage.getItem(`2d_nums_${currentDrawId}`);
      if (savedNums) {
        const localNums = JSON.parse(savedNums) as Record<string, number[]>;
        if (series.every(s => Array.isArray(localNums[s.base]) && localNums[s.base].length === 10)) {
          setAutoGeneratedNumbers(localNums);
          savePending2D(localNums, overrides);
          return;
        }
      }
    } catch {}

    // Tier 3: First-ever load — generate fresh + persist to both
    const generated: Record<string, number[]> = {};
    series.forEach((s) => {
      generated[s.base] = generateSmartNumbers(s.base, betData[s.base] || []);
    });
    setAutoGeneratedNumbers(generated);
    try { localStorage.setItem(`2d_nums_${currentDrawId}`, JSON.stringify(generated)); } catch {}
    savePending2D(generated, {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawInfo, betData, series, savePending2D]); // intentionally excludes autoGeneratedNumbers to run only once

  // 4. Fetch Bet Distribution (always, refreshes every 10s)
  const fetchBetDistribution = useCallback(async () => {
    if (!currentDrawId) return;

    const { data, error } = await supabase.rpc('admin_get_bets_for_draw', {
      p_draw_id: currentDrawId,
    });

    if (error) {
      console.error('Error fetching bets:', error);
      return;
    }

    const dataBySeries: Record<string, BetAggData[]> = {};
    for (const s of series) {
      const aggMap = new Map<string, BetAggData>();
      data?.forEach((bet: { number: number; bet_type: string; quantity: number }) => {
        if (bet.number < s.base || bet.number >= s.base + 1000) return;
        const key = `${bet.number}_${bet.bet_type}`;
        if (!aggMap.has(key)) {
          aggMap.set(key, { number: bet.number, bet_type: bet.bet_type, total_qty: 0, bet_count: 0 });
        }
        const entry = aggMap.get(key)!;
        entry.total_qty += bet.quantity;
        entry.bet_count += 1;
      });
      dataBySeries[s.base] = Array.from(aggMap.values()).sort((a, b) => b.total_qty - a.total_qty);
    }

    setBetData(dataBySeries);
  }, [series, currentDrawId]);

  useEffect(() => {
    fetchBetDistribution();
    const id = setInterval(fetchBetDistribution, 10000); // refresh every 10s
    return () => clearInterval(id);
  }, [fetchBetDistribution]);

  useEffect(() => {
    if (gameMode !== '2D') return;
    if (Object.keys(autoGeneratedNumbers).length === 0) return;
    if (Object.keys(betData).length === 0) return;
    if (drawInfo?.published_at) return;
    // If admin has manually overridden any slot, trust their choice — don't auto-regenerate
    if (Object.keys(overrides).length > 0) return;

    const effNums: Record<string, number[]> = {};
    for (const s of series) {
      const base = autoGeneratedNumbers[s.base] ?? Array(10).fill(0);
      effNums[s.base] = base.map((num: number) => num);
    }

    const { projectedWinning, totalPool } = computeProjectedWinning2D(betData, effNums);
    const cap = Math.floor(totalPool * 0.80);

    if (projectedWinning > cap) {
      const generated: Record<string, number[]> = {};
      series.forEach((s) => {
        generated[s.base] = generate2DSafeNumbers(s.base, betData[s.base] || []);
      });
      setAutoGeneratedNumbers(generated);
      try {
        localStorage.setItem(`2d_nums_${currentDrawId}`, JSON.stringify(generated));
      } catch {}
      savePending2D(generated, {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [betData, gameMode]);

  // Actions
  const handleOverride = (seriesBase: number, index: number, val: string) => {
    const newOverrides = { ...overrides, [`${seriesBase}_${index}`]: val };
    setOverrides(newOverrides);
    try { localStorage.setItem(`2d_ovrs_${currentDrawId}`, JSON.stringify(newOverrides)); } catch {}
    savePending2D(autoGeneratedNumbers, newOverrides);
    setDbCapOverride(true);
  };

  const handleResetSlot = (seriesBase: number, index: number) => {
    const newOverrides = { ...overrides };
    delete newOverrides[`${seriesBase}_${index}`];
    setOverrides(newOverrides);
    try { localStorage.setItem(`2d_ovrs_${currentDrawId}`, JSON.stringify(newOverrides)); } catch {}
    savePending2D(autoGeneratedNumbers, newOverrides);
  };

  const handleResetSeries = (seriesBase: number) => {
    const newOverrides = { ...overrides };
    for (let i = 0; i < 10; i++) delete newOverrides[`${seriesBase}_${i}`];
    setOverrides(newOverrides);
    try { localStorage.setItem(`2d_ovrs_${currentDrawId}`, JSON.stringify(newOverrides)); } catch {}
    savePending2D(autoGeneratedNumbers, newOverrides);
  };

  const handleRegenerate = () => {
    if (!window.confirm('Regenerate numbers from current bet distribution? This will reset all overrides.')) return;
    const generated: Record<string, number[]> = {};
    series.forEach((s) => {
      generated[s.base] = generateSmartNumbers(s.base, betData[s.base] || []);
    });
    setAutoGeneratedNumbers(generated);
    setOverrides({});
    try {
      localStorage.setItem(`2d_nums_${currentDrawId}`, JSON.stringify(generated));
      localStorage.removeItem(`2d_ovrs_${currentDrawId}`);
    } catch {}
    savePending2D(generated, {});
    setDbCapOverride(false);
  };

  const isValidNumber = (seriesBase: number, numStr: string | number, slotIndex?: number) => {
    const n = parseInt(String(numStr), 10);
    if (isNaN(n)) return false;
    if (n < seriesBase || n >= seriesBase + 1000) return false;
    // If slot index is provided, enforce the prefix rule
    if (slotIndex !== undefined) {
      const expectedPrefix = Math.floor(seriesBase / 100) + slotIndex;
      const actualPrefix = Math.floor(n / 100);
      if (actualPrefix !== expectedPrefix) return false;
      // Last two digits must be 01-99 (not 00)
      const suffix = n % 100;
      if (suffix < 1 || suffix > 99) return false;
    }
    return true;
  };

  // Reset all 2D state when draw changes
  useEffect(() => {
    setTimeRemaining(9999);
    setDrawInfo(null);
    setAutoGeneratedNumbers({});
    try {
      const savedOvrs = localStorage.getItem(`2d_ovrs_${currentDrawId}`);
      setOverrides(savedOvrs ? JSON.parse(savedOvrs) : {});
    } catch {
      setOverrides({});
    }
  }, [currentDrawId]);

  const formatSecs = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const effectiveNumbers: Record<string, number[]> = {};
  for (const s of series) {
    const base = autoGeneratedNumbers[s.base] ?? Array(10).fill(0);
    effectiveNumbers[s.base] = base.map((num: number, idx: number) => {
      const ovr = overrides[`${s.base}_${idx}`];
      return ovr ? (parseInt(ovr) || num) : num;
    });
  }
  const { projectedWinning: totalWinning2D, totalPool: totalPool2D } =
    computeProjectedWinning2D(betData, effectiveNumbers);
  const adminCollect2D = totalPool2D - totalWinning2D;

  return (
    <div className="space-y-6">
      {/* Game Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setGameMode('2D')}
          className={`px-6 py-2 rounded font-bold text-sm tracking-wider transition-colors ${gameMode === '2D' ? 'bg-purple-600 text-white shadow' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
        >
          2D GAME
        </button>
        <button
          onClick={() => setGameMode('3D')}
          className={`px-6 py-2 rounded font-bold text-sm tracking-wider transition-colors ${gameMode === '3D' ? 'bg-pink-600 text-white shadow' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
        >
          3D GAME
        </button>
      </div>

      {/* ── 3D PANEL ── */}
      {gameMode === '3D' && (
        <div className="space-y-4">
          {/* 3D Header */}
          <div className="bg-white rounded shadow p-4 flex items-center justify-between border-l-4 border-pink-600">
            <div>
              <div className="text-sm text-gray-500 font-medium uppercase tracking-wider">3D Game</div>
              <div className="text-xl font-bold text-gray-900">
                {draws3d.length > 0
                  ? `${draws3d[0].draw_date} • ${formatSlotLabelAsRange(draws3d[0].timeslot_label)}`
                  : 'No open 3D draws found'}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-xs text-gray-500 uppercase font-medium">Ends In</div>
                <div className={`text-2xl font-mono font-bold ${countdown3d <= 30 ? 'text-red-600' : 'text-gray-900'}`}>
                  {draws3d.length === 0 ? '—' : fmt3DSecs(countdown3d)}
                </div>
              </div>
              {countdown3d <= 30 && countdown3d > 0 && (
                <div className="animate-pulse bg-red-100 text-red-800 border border-red-300 px-4 py-2 rounded font-bold uppercase tracking-wider text-sm">
                  Auto-publishing soon
                </div>
              )}
            </div>
          </div>

          {/* 3D Mode Panels (A, B, C side by side) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['A', 'B', 'C'] as const).map((mode) => {
              const draw = draws3d.find((d) => d.mode === mode);
              const modeBets = bets3d[mode] ?? [];
              const modeColors: Record<string, string> = { A: '#22aa22', B: '#cc2222', C: '#2266cc' };
              const isPublished = !!draw?.published_at;

              return (
                <div key={mode} className="bg-white rounded shadow overflow-hidden">
                  <div className="p-3 text-white font-bold text-lg text-center" style={{ background: modeColors[mode] }}>
                    MODE {mode}
                    {isPublished && (
                      <span className="ml-2 bg-white/20 px-2 py-0.5 rounded text-sm">
                        Result: {draw.result_number !== null ? String(draw.result_number).padStart(3, '0') : '--'}
                      </span>
                    )}
                  </div>

                  {!draw ? (
                    <div className="p-4 text-gray-500 text-sm text-center">No open draw for Mode {mode}</div>
                  ) : isPublished ? (
                    <div className="p-4 text-center">
                      <div className="text-green-700 font-bold">Result Published ✓</div>
                      <div className="text-3xl font-mono font-black mt-2">
                        {draw.result_number !== null ? String(draw.result_number).padStart(3, '0') : '--'}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 space-y-3">
                      {/* Pool summary (3D per mode) */}
                      {(() => {
                        const modePool = modeBets.reduce((sum, b) => sum + b.total_amt, 0);
                        if (modePool === 0) return null;
                        const resultNum = parseInt(results3d[mode] ?? '', 10);
                        const modeWinning = !isNaN(resultNum)
                          ? computeProjected3DPayout(resultNum, modeBets)
                          : 0;
                        const modeAdminColl = modePool - modeWinning;
                        return (
                          <div className="grid grid-cols-3 gap-2 text-xs text-center bg-gray-50 border rounded px-3 py-2">
                            <div>
                              <div className="text-gray-400">Total Sell</div>
                              <div className="font-bold">{modePool} pts</div>
                            </div>
                            <div>
                              <div className="text-gray-400">Winning</div>
                              <div className={`font-bold ${modeWinning > Math.floor(modePool * 0.80) ? 'text-red-600' : 'text-green-600'}`}>{modeWinning} pts</div>
                            </div>
                            <div>
                              <div className="text-gray-400">Admin</div>
                              <div className="font-bold text-blue-600">{modeAdminColl} pts</div>
                            </div>
                          </div>
                        );
                      })()}
                      {/* Top bets */}
                      <div className="text-xs font-bold text-gray-500 uppercase">Top Bets</div>
                      {modeBets.length === 0 ? (
                        <div className="text-xs text-gray-400">No bets yet</div>
                      ) : (
                        <table className="w-full text-xs">
                          <thead><tr className="bg-gray-50"><th className="p-1 text-left">No.</th><th className="p-1 text-left">Type</th><th className="p-1 text-right">Amt</th></tr></thead>
                          <tbody>
                            {modeBets.map((b, i) => (
                              <tr key={i} className={i < 3 ? 'bg-red-50 text-red-800 font-medium' : ''}>
                                <td className="p-1">{display3DNumber(b.number, b.bet_type)}</td>
                                <td className="p-1">{b.bet_type}</td>
                                <td className="p-1 text-right">{b.total_amt}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                      {/* Result input */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-bold text-gray-500 uppercase">
                            Result (000–999)
                            {autoGen3d[mode] && <span className="ml-1 text-yellow-600">(auto)</span>}
                          </div>
                          <div className={`text-[10px] font-bold ${
                            saveStatus3d[mode] === 'error' ? 'text-red-600'
                            : saveStatus3d[mode] === 'saved' ? 'text-green-600'
                            : saveStatus3d[mode] === 'saving' ? 'text-yellow-600'
                            : 'text-transparent'
                          }`}>
                            {saveStatus3d[mode] === 'error' ? '⚠ Failed'
                            : saveStatus3d[mode] === 'saved' ? '✓ Saved'
                            : saveStatus3d[mode] === 'saving' ? 'Saving…'
                            : '·'}
                          </div>
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={3}
                          value={results3d[mode] ?? ''}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, '');
                            setResults3d((p) => ({ ...p, [mode]: v }));
                            setAutoGen3d((p) => ({ ...p, [mode]: false }));
                            if (v !== '' && draw) {
                              const n = parseInt(v, 10);
                              if (!isNaN(n) && n >= 0 && n <= 999) {
                                try { localStorage.setItem(`3d_result_${draw.id}`, String(n).padStart(3, '0')); } catch {}
                                savePending3D(draw.id, n, mode);
                                setDb3DCapOverride(draw.id, true);
                              }
                            }
                          }}
                          className="w-full text-center font-mono font-bold text-xl rounded p-2 focus:outline-none"
                          style={{
                            border: `2px solid ${autoGen3d[mode] ? '#d97706' : '#6b7280'}`,
                            background: autoGen3d[mode] ? '#fefce8' : '#fff',
                          }}
                          placeholder="---"
                        />
                        {(() => {
                          const resultNum = parseInt(results3d[mode] ?? '', 10);
                          if (isNaN(resultNum) || modeBets.length === 0) return null;
                          const projected = computeProjected3DPayout(resultNum, modeBets);
                          const modePool = modeBets.reduce((s, b) => s + b.total_amt, 0);
                          const cap = Math.floor(modePool * 0.80);
                          const over = projected > cap;
                          return (
                            <div className={`text-xs px-2 py-1 rounded mt-1 ${over ? 'bg-red-100 text-red-700 font-bold' : 'bg-green-50 text-green-700'}`}>
                              Projected payout: {projected} pts
                              {over
                                ? ` ⚠ OVER 80% cap (${cap} pts) — change result`
                                : ` ✓ within cap (${cap} pts)`}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Save button for all 3D results */}
          {draws3d.some((d) => !d.published_at) && (
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={handleManualSave3DAll}
                disabled={Object.values(saveStatus3d).some(s => s === 'saving')}
                className="px-5 py-2 rounded font-bold text-sm uppercase tracking-wider transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait shadow"
              >
                {Object.values(saveStatus3d).some(s => s === 'saving') ? '💾 Saving…' : '💾 Save All Results'}
              </button>
              <div className={`text-sm font-bold ${
                Object.values(saveStatus3d).some(s => s === 'error') ? 'text-red-600'
                : Object.values(saveStatus3d).some(s => s === 'saved') ? 'text-green-600'
                : 'text-gray-400'
              }`}>
                {Object.values(saveStatus3d).some(s => s === 'error') ? '⚠ Save failed — retry'
                : Object.values(saveStatus3d).every(s => s === 'saved' || s === 'idle') && Object.values(saveStatus3d).some(s => s === 'saved') ? '✓ All saved to DB'
                : ''}
              </div>
            </div>
          )}

          {/* Auto-publish status */}
          {draws3d.some((d) => !d.published_at) && (
            <div className={`w-full py-3 rounded font-bold text-sm text-center uppercase tracking-widest mt-1
              ${countdown3d <= 30 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
              {countdown3d === 0 ? 'Finalising…' : `Auto-publishes at lockout (${fmt3DSecs(countdown3d)})`}
            </div>
          )}
        </div>
      )}

      {/* ── 2D PANEL ── */}
      {gameMode === '2D' && <>

      {/* Header Bar */}
      <div className="bg-white rounded shadow p-4 flex items-center justify-between border-l-4 border-purple-600">
        <div>
          <div className="text-sm text-gray-500 font-medium uppercase tracking-wider">Current Draw</div>
          <div className="text-xl font-bold text-gray-900">
            {drawInfo ? `${drawInfo.draw_date} • ${formatSlotLabelAsRange(drawInfo.timeslot_label)}` : 'Loading...'}
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase font-medium">Ends In</div>
            <div className={`text-2xl font-mono font-bold ${timeRemaining <= 30 ? 'text-red-600' : 'text-gray-900'}`}>
              {formatSecs(timeRemaining)}
            </div>
          </div>
          {isLocked && !drawInfo?.published_at && (
            <div className="animate-pulse bg-red-100 text-red-800 border border-red-300 px-4 py-2 rounded font-bold uppercase tracking-wider">
              Publish Window Active
            </div>
          )}
          {drawInfo?.published_at && (
            <div className="bg-green-100 text-green-800 border border-green-300 px-4 py-2 rounded font-bold uppercase tracking-wider">
              Result Published
            </div>
          )}
        </div>
      </div>

      {/* Pool summary (2D) */}
      {totalPool2D > 0 && (
        <div className="bg-gray-50 border rounded px-4 py-3 grid grid-cols-3 gap-4 text-sm text-center">
          <div>
            <div className="text-gray-500 text-xs">Total Sell Placed</div>
            <div className="font-bold text-lg">{totalPool2D} pts</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">Projected Winning</div>
            <div className="font-bold text-lg text-green-600">{totalWinning2D} pts</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">Admin Collection</div>
            <div className="font-bold text-lg text-blue-600">{adminCollect2D} pts</div>
          </div>
        </div>
      )}

      {/* Section A: Bet Distribution (always visible) */}
      <div className="bg-white rounded shadow p-4 space-y-4">
        <h2 className="text-lg font-bold border-b pb-2">Live Bet Distribution (Auto-refreshes every 10s)</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {series.map((s) => {
            const sData = betData[s.base] || [];
            const totalSeriesQty = sData.reduce((sum, d) => sum + d.total_qty, 0);
            const isExpanded = expandedSeries[s.base];

            return (
              <div key={s.base} className="border rounded" style={{ borderColor: s.color }}>
                <div
                  className="flex justify-between items-center p-2 cursor-pointer text-white font-bold"
                  style={{ backgroundColor: s.color }}
                  onClick={() => setExpandedSeries(p => ({ ...p, [s.base]: !p[s.base] }))}
                >
                  <span>{s.label} Series</span>
                  <span className="text-sm bg-white/20 px-2 py-0.5 rounded">Total Qty: {totalSeriesQty}</span>
                </div>

                {isExpanded && (
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {sData.length === 0 ? (
                      <div className="text-gray-500 text-sm text-center py-4">No bets placed in this series.</div>
                    ) : (
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="p-1 border-b">Num</th>
                            <th className="p-1 border-b">Type</th>
                            <th className="p-1 border-b text-right">Qty</th>
                            <th className="p-1 border-b">Bar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sData.map((d, idx) => {
                            const isTop3 = idx < 3 && d.total_qty > 0;
                            const pct = totalSeriesQty > 0 ? (d.total_qty / totalSeriesQty) * 100 : 0;
                            return (
                              <tr key={`${d.number}_${d.bet_type}`} className={isTop3 ? 'bg-red-50 text-red-900 font-medium' : ''}>
                                <td className="p-1 border-b">{d.number}</td>
                                <td className="p-1 border-b text-xs">{d.bet_type}</td>
                                <td className="p-1 border-b text-right">{d.total_qty}</td>
                                <td className="p-1 border-b w-1/3">
                                  <div className="w-full bg-gray-200 h-2 rounded overflow-hidden">
                                    <div className={`h-full ${isTop3 ? 'bg-red-500' : 'bg-gray-400'}`} style={{ width: `${pct}%` }}></div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section B: Result Numbers Editor */}
      <div className="bg-white rounded shadow p-4 space-y-6">
        <div className="flex justify-between items-end border-b pb-2">
          <h2 className="text-lg font-bold">Result Numbers Editor</h2>
          <div className="flex items-center gap-3">
            <div className={`text-xs font-bold ${
              saveStatus2d === 'error' ? 'text-red-600'
              : saveStatus2d === 'saved' ? 'text-green-600'
              : saveStatus2d === 'saving' ? 'text-yellow-600'
              : 'text-gray-400'
            }`}>
              {saveStatus2d === 'error' ? '⚠ Save failed'
              : saveStatus2d === 'saved' ? '✓ Saved to DB'
              : saveStatus2d === 'saving' ? 'Saving…'
              : ''}
            </div>
            <button
              disabled={!isEditable || !!drawInfo?.published_at || saveStatus2d === 'saving'}
              onClick={handleManualSave2D}
              className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveStatus2d === 'saving' ? '💾 Saving…' : '💾 Save Results'}
            </button>
            <button
              disabled={!isEditable || !!drawInfo?.published_at}
              onClick={handleRegenerate}
              className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded border border-blue-300 disabled:opacity-50"
            >
              Regenerate (80/20)
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {series.map((s) => {
            const autoNums = autoGeneratedNumbers[s.base] || [];
            
            return (
              <div key={s.base} className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-24 font-bold text-sm uppercase tracking-wider" style={{ color: s.color }}>
                    {s.label}
                  </div>
                  <button
                    disabled={!isEditable || drawInfo?.published_at != null}
                    onClick={() => handleResetSeries(s.base)}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 disabled:opacity-50"
                  >
                    Reset All
                  </button>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const ov = overrides[`${s.base}_${i}`];
                    const autoVal = autoNums[i];
                    const currentVal = ov !== undefined ? ov : (autoVal !== undefined ? String(autoVal) : '');
                    const prefix = Math.floor(s.base / 100) + i; // e.g. 10,11,...19
                    
                    const isEdited = ov !== undefined;
                    const isValid = currentVal === '' || isValidNumber(s.base, currentVal, i);

                    return (
                      <div key={i} className="relative group">
                        <div className="text-[9px] text-gray-500 text-center font-bold mb-0.5">{prefix}XX</div>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={4}
                          value={currentVal}
                          disabled={!isEditable || drawInfo?.published_at != null}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, ''); // only digits
                            handleOverride(s.base, i, raw);
                          }}
                          className={`w-16 h-10 text-center font-mono font-bold rounded border-2 outline-none transition-colors disabled:bg-gray-100 disabled:text-gray-500
                            ${!isValid ? 'border-red-500 focus:border-red-600 bg-red-50' : 
                               isEdited ? 'border-yellow-400 focus:border-yellow-500 bg-yellow-50' : 
                               'border-gray-300 focus:border-blue-500'}
                          `}
                          placeholder={`${prefix}--`}
                        />
                        {isEdited && isValid && (
                          <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center cursor-pointer shadow"
                               title="Reset to auto-generated"
                               onClick={() => { if (!drawInfo?.published_at) handleResetSlot(s.base, i); }}>
                            *
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Auto-publish status */}
      {!drawInfo?.published_at && (
        <div className="flex justify-end pt-4">
          <div className={`px-6 py-3 rounded font-bold text-sm tracking-wide
            ${timeRemaining <= 30 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
            {timeRemaining === 0 ? 'Finalising…' : `Auto-publishes at lockout (${formatSecs(timeRemaining)})`}
          </div>
        </div>
      )}

      </> /* end 2D panel */}

    </div>
  );
};

export default AdminSuperPanel;
