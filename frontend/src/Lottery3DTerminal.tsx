import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
import { supabase } from './lib/supabase';
import { uploadReceiptToStorage } from './features/lottery/receipt';
import { generate3DReceiptHtml } from './features/lottery3d/receipt3d';
import Terminal3DStyles from './features/lottery3d/components/Terminal3DStyles';
import DigitSelector from './features/lottery3d/components/DigitSelector';
import ModeSelector from './features/lottery3d/components/ModeSelector';
import FilterSelector from './features/lottery3d/components/FilterSelector';
import BetTypeSelector from './features/lottery3d/components/BetTypeSelector';
import RateSelector from './features/lottery3d/components/RateSelector';
import BetList from './features/lottery3d/components/BetList';
import { NAV_TABS_3D } from './features/lottery3d/constants';
import type { ActiveTab3D, BetListEntry, BetType3D, Filter3D, Mode3D } from './features/lottery3d/types';
import {
  generate3DLuckyPick,
  generate3DNumbers,
  uniqueDigitsOf,
  formatNumber3D,
  formatDate,
  formatTime12,
  completePairNumber,
} from './features/lottery3d/utils';
import { formatSlotLabelAsRange } from './features/lottery/utils';

// ── Receipt helpers ────────────────────────────────────────────────────────────


function open3DReceiptWindow(html: string): boolean {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  if (!w) return false;
  return true;
}


async function save3DReceiptUrl(barcode: string, url: string) {
  await supabase.rpc('update_3d_bet_receipt', { p_barcode: barcode, p_receipt_url: url });
}

// ── Time / slot helpers ───────────────────────────────────────────────────────

function getSlotLogic(): {
  slotLabel: string;
  countdown: number;
  slotsOver: boolean;
  nextSlotText: string;
  currentSlotStartLabel: string;
} {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const currentTotalMins = h * 60 + m;
  const startMins = 8 * 60 + 45;
  const endMins = 22 * 60;

  const formatTime = (totalMins: number): string => {
    let hr = Math.floor(totalMins / 60) % 24;
    const mn = totalMins % 60;
    const ampm = hr >= 12 ? 'PM' : 'AM';
    hr = hr % 12 || 12;
    return `${String(hr).padStart(2, '0')}:${String(mn).padStart(2, '0')} ${ampm}`;
  };

  if (currentTotalMins >= startMins && currentTotalMins < endMins) {
    const slotsPassed = Math.floor((currentTotalMins - startMins) / 15);
    const slotStartMins = startMins + slotsPassed * 15;
    const targetMins = slotStartMins + 15;
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, targetMins, 0, 0);
    const diffSecs = Math.max(0, Math.floor((targetDate.getTime() - now.getTime()) / 1000));
    return {
      slotLabel: formatTime(targetMins),
      countdown: diffSecs,
      slotsOver: false,
      nextSlotText: '',
      currentSlotStartLabel: formatTime(slotStartMins),
    };
  }

  const slotsOver = currentTotalMins >= endMins;
  const nextMins = slotsOver ? startMins + 24 * 60 : startMins;
  const targetDate = new Date(now.getFullYear(), now.getMonth(), slotsOver ? now.getDate() + 1 : now.getDate(), 0, nextMins, 0, 0);
  const diffSecs = Math.max(0, Math.floor((targetDate.getTime() - now.getTime()) / 1000));
  return {
    slotLabel: formatTime(startMins),
    countdown: diffSecs,
    slotsOver: true,
    nextSlotText: slotsOver ? 'Next session starts tomorrow at 08:45 AM' : 'Session starts at 08:45 AM',
    currentSlotStartLabel: formatTime(startMins),
  };
}

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

// ── Advance Draw slot helpers ──────────────────────────────────────────────────
const ADV3D_START_HOUR = 8, ADV3D_START_MIN = 45, ADV3D_END_HOUR = 22, ADV3D_INTERVAL = 15;
type AdvSlot3D = { label: string; displayLabel: string; minutes: number };
function buildAdvSlots3D(): AdvSlot3D[] {
  const slots: AdvSlot3D[] = [];
  const start = ADV3D_START_HOUR * 60 + ADV3D_START_MIN;
  const end = ADV3D_END_HOUR * 60;
  const fmtTime = (t: number) => {
    const h = Math.floor(t / 60), m = t % 60;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${suffix}`;
  };
  for (let t = start; t <= end; t += ADV3D_INTERVAL) {
    slots.push({ label: fmtTime(t), displayLabel: fmtTime(t + ADV3D_INTERVAL), minutes: t });
  }
  return slots;
}
const ALL_ADV_SLOTS_3D = buildAdvSlots3D();

const Lottery3DTerminal: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();

  // ── Advance mode local state ──
  const [advanceSlots, setAdvanceSlots] = useState<string[]>([]);
  const [showAdvanceModal3D, setShowAdvanceModal3D] = useState(false);
  const [modal3DSelectedDraws, setModal3DSelectedDraws] = useState<Set<string>>(new Set());
  const [modal3DTopInput, setModal3DTopInput] = useState('');
  const [nowMinutes3D, setNowMinutes3D] = useState<number>(() => {
    const d = new Date(); return d.getHours() * 60 + d.getMinutes();
  });
  const isAdvanceMode = advanceSlots.length > 0;

  // ── Time state ──
  const [currentTime, setCurrentTime] = useState(() => formatTime12(new Date()));
  const [today] = useState(() => formatDate(new Date()));
  const [countdown, setCountdown] = useState(0);
  const [slotsOver, setSlotsOver] = useState(false);
  const [nextSlotText, setNextSlotText] = useState('');
  const [slotLabel, setSlotLabel] = useState('');
  const [dbSlotLabel, setDbSlotLabel] = useState('');

  // ── Draw state ──
  const [drawIds, setDrawIds] = useState<{ A: string | null; B: string | null; C: string | null }>({ A: null, B: null, C: null });
  const [lastResult, setLastResult] = useState<{ time: string; numbers: { A?: number; B?: number; C?: number } }>({ time: '', numbers: {} });

  // ── Game state ──
  const [selectedDigits, setSelectedDigits] = useState<Set<number>>(new Set());
  const [highlightedDigits, setHighlightedDigits] = useState<Set<number>>(new Set());
  const [selectedFilters, setSelectedFilters] = useState<Set<Filter3D>>(new Set());
  const [activeBetTypes, setActiveBetTypes] = useState<Set<BetType3D>>(new Set(['BOX']));
  const [selectedModes, setSelectedModes] = useState<Set<Mode3D>>(new Set<Mode3D>(['A']));
  const [rate, setRate] = useState(10);
  const [luckyCount, setLuckyCount] = useState<number>(10);
  const [betList, setBetList] = useState<BetListEntry[]>([]);
  const [manualInput, setManualInput] = useState('');

  const PAIR_TYPES = new Set<BetType3D>(['FP', 'BP', 'SP', 'AP']);
  const isPairInput = useMemo(
    () => activeBetTypes.size > 0 && [...activeBetTypes].every((t) => PAIR_TYPES.has(t)),
    [activeBetTypes]
  );

  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [lastTransId, setLastTransId] = useState<string | null>(() => localStorage.getItem('last3DTransId'));

  useEffect(() => {
    if (lastTransId) {
      localStorage.setItem('last3DTransId', lastTransId);
    }
  }, [lastTransId]);
  const [placingBet, setPlacingBet] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [isMotorMode, setIsMotorMode] = useState(false);

  const balance = profile?.points ?? 0;
  const username = profile?.display_name ?? profile?.username ?? 'User';

  // ── Clock tick ──
  useEffect(() => {
    const tick = () => {
      setCurrentTime(formatTime12(new Date()));
      const s = getSlotLogic();
      setCountdown(s.countdown);
      setSlotsOver(s.slotsOver);
      setNextSlotText(s.nextSlotText);
      setSlotLabel(s.slotLabel);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Advance modal: refresh nowMinutes so past slots disappear ──
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNowMinutes3D(d.getHours() * 60 + d.getMinutes());
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const availableAdvSlots3D = useMemo(
    () => ALL_ADV_SLOTS_3D.filter((s) => s.minutes + ADV3D_INTERVAL > nowMinutes3D),
    [nowMinutes3D]
  );

  // ── Fetch open draws_3d for current slot ──
  const fetchDraws = useCallback(async () => {
    await supabase.rpc('get_or_create_current_3d_draws');

    const { data, error } = await supabase
      .from('draws_3d')
      .select('id, mode, scheduled_at')
      .eq('status', 'open')
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('Error fetching 3d draws:', error);
      setTimeout(fetchDraws, 3000);
      return;
    }

    const ids: { A: string | null; B: string | null; C: string | null } = { A: null, B: null, C: null };
    if (data) {
      for (const row of data as { id: string; mode: string; scheduled_at: string }[]) {
        if ((row.mode === 'A' || row.mode === 'B' || row.mode === 'C') && ids[row.mode as Mode3D] === null) {
          ids[row.mode as Mode3D] = row.id;
        }
      }
      const firstDraw = (data as { id: string; mode: string; scheduled_at: string }[])
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0];
      if (firstDraw?.scheduled_at) {
        const d = new Date(firstDraw.scheduled_at);
        const h = d.getHours(), m = d.getMinutes();
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        setDbSlotLabel(`${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`);
      }
    }
    setDrawIds(ids);

    if (!ids.A && !ids.B && !ids.C) {
      setTimeout(fetchDraws, 2000);
    }
  }, []);

  // ── Fetch last 3D result ──
  const fetchLastResult = useCallback(async () => {
    const { data } = await supabase
      .from('draws_3d')
      .select('mode, result_number, scheduled_at')
      .eq('status', 'resulted')
      .order('scheduled_at', { ascending: false })
      .limit(3);

    if (!data || data.length === 0) return;

    const nums: { A?: number; B?: number; C?: number } = {};
    let latestTime = '';
    for (const row of data as { mode: string; result_number: number | null; scheduled_at: string }[]) {
      if (row.mode === 'A' || row.mode === 'B' || row.mode === 'C') {
        if (row.result_number !== null) nums[row.mode as Mode3D] = row.result_number;
      }
      if (!latestTime) {
        const d = new Date(row.scheduled_at);
        latestTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      }
    }
    setLastResult({ time: latestTime, numbers: nums });
  }, []);

  useEffect(() => {
    fetchDraws();
    fetchLastResult();

    const ch = supabase
      .channel('3d-draws-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'draws_3d' }, () => {
        fetchDraws();
        fetchLastResult();
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [fetchDraws, fetchLastResult]);

  // ── Nav tab handler ──
  const handleTabClick = useCallback((tab: ActiveTab3D) => {
    if (tab === 'HISTORY') { navigate('/history', { state: { gameType: '3D' } }); return; }
    if (tab === 'CANCEL')  { navigate('/cancel-ticket', { state: { gameType: '3D' } }); return; }
    if (tab === 'RESULT')  { navigate('/results', { state: { activeTab: '3D' } }); return; }
    if (tab === 'ADVANCE DRAW') {
      setModal3DSelectedDraws(new Set(advanceSlots));
      setModal3DTopInput('');
      setShowAdvanceModal3D(true);
      return;
    }
    if (tab === 'REFRESH') {
      setBetList([]);
      setSelectedDigits(new Set());
      setHighlightedDigits(new Set());
      setSelectedFilters(new Set());
      setActiveBetTypes(new Set(['STR']));
      setSelectedModes(new Set(['A']));
      setRate(10);
      setLuckyCount(10);
      setIsMotorMode(false);
      setAdvanceSlots([]);
    }
  }, [navigate, advanceSlots]);

  // ── Digit selection ──
  const toggleDigit = useCallback((d: number) => {
    setSelectedDigits((prev) => {
      const next = new Set(prev);
      next.has(d) ? next.delete(d) : next.add(d);
      return next;
    });
  }, []);

  const toggleAllDigits = useCallback(() => {
    setSelectedDigits((prev) =>
      prev.size === 10 ? new Set() : new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
    );
  }, []);

  // ── Filter selection ──
  const toggleFilter = useCallback((f: Filter3D) => {
    setSelectedFilters((prev) => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  }, []);

  // ── Bet type selection ──
  const toggleBetType = useCallback((t: BetType3D) => {
    setActiveBetTypes((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      if (next.size === 0) next.add(t); // keep at least one
      return next;
    });
  }, []);

  const toggleAllBetTypes = useCallback(() => {
    setActiveBetTypes((prev) =>
      prev.size === 6 ? new Set<BetType3D>(['BOX']) : new Set<BetType3D>(['STR', 'BOX', 'FP', 'BP', 'SP', 'AP']),
    );
  }, []);

  // ── Mode selection ──
  const toggleMode = useCallback((m: Mode3D) => {
    setSelectedModes((prev) => {
      const next = new Set(prev);
      next.has(m) ? next.delete(m) : next.add(m);
      if (next.size === 0) next.add(m);
      return next;
    });
  }, []);

  const toggleAllModes = useCallback(() => {
    setSelectedModes((prev) =>
      prev.size === 3 ? new Set<Mode3D>(['A']) : new Set<Mode3D>(['A', 'B', 'C']),
    );
  }, []);

  // ── Remove bet from list ──
  const removeBet = useCallback((id: string) => {
    setBetList((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // ── Motor: First click enters mode, second click generates bets ──
  const handleMotor = useCallback(() => {
    if (!isMotorMode) {
      setIsMotorMode(true);
      setActiveBetTypes(new Set(['STR']));
    } else {
      if (selectedDigits.size === 0) { alert('Select at least one digit.'); return; }
      if (selectedFilters.size === 0) { alert('Select at least one filter (Single/Duplicate/Triple).'); return; }
      const nums = generate3DNumbers(selectedDigits, selectedFilters);
      if (nums.length === 0) { alert('No numbers match selected digits and filter.'); return; }
      
      setBetList((prev) => {
        const newEntries: BetListEntry[] = [];
        const modesArray = Array.from(selectedModes);
        for (const n of nums) {
          for (const m of modesArray) {
            newEntries.push({ 
              id: `${n}-${m}-STR-${Date.now()}-${Math.random()}`, 
              number: n, 
              betType: 'STR' as BetType3D, 
              mode: m,
              amount: rate 
            });
          }
        }
        return [...prev, ...newEntries];
      });
      setIsMotorMode(false);
    }
  }, [isMotorMode, selectedDigits, selectedFilters, rate, selectedModes]);

  // ── Lucky Pick: generate luckyCount random numbers, filtered by selectedFilters ──
  const handleLuckyPick = useCallback(() => {
    const n = Math.floor(luckyCount);
    if (!Number.isFinite(n) || n < 1) {
      alert('Enter a quantity ≥ 1.');
      return;
    }
    const nums = generate3DLuckyPick(selectedFilters, n);
    if (nums.length === 0) {
      alert('Pool empty for selected filters.');
      return;
    }
    setHighlightedDigits(uniqueDigitsOf(nums));
    setBetList((prev) => {
      const newEntries: BetListEntry[] = [];
      const modesArray = Array.from(selectedModes);
      for (const num of nums) {
        for (const m of modesArray) {
          for (const bt of activeBetTypes) {
            newEntries.push({
              id: `${num}-${m}-${bt}-${Date.now()}-${Math.random()}`,
              number: num,
              betType: bt,
              mode: m,
              amount: rate,
            });
          }
        }
      }
      return [...prev, ...newEntries];
    });
  }, [luckyCount, selectedFilters, activeBetTypes, rate]);

  // ── Add Range ──
  const handleAddRange = useCallback(() => {
    const from = parseInt(rangeFrom, 10);
    const to   = parseInt(rangeTo, 10);
    if (isNaN(from) || isNaN(to) || from < 0 || to > 999 || from > to) {
      alert('Enter a valid range (000–999, from ≤ to).');
      return;
    }
    setBetList((prev) => {
      const newEntries: BetListEntry[] = [];
      const modesArray = Array.from(selectedModes);
      for (let n = from; n <= to; n++) {
        for (const m of modesArray) {
          for (const bt of activeBetTypes) {
            newEntries.push({
              id: `${n}-${m}-${bt}-${Date.now()}-${n}-${bt}`,
              number: n,
              betType: bt,
              mode: m,
              amount: rate,
            });
          }
        }
      }
      return [...prev, ...newEntries];
    });
    setRangeFrom('');
    setRangeTo('');
  }, [rangeFrom, rangeTo, activeBetTypes, rate]);

  // ── Total cost: rate × betTypesCount × modesCount per number (× advanceSlots if advance mode) ──
  const totalCost = useMemo(
    () => {
      const base = betList.reduce((s, b) => s + b.amount, 0);
      return isAdvanceMode ? base * advanceSlots.length : base;
    },
    [betList, isAdvanceMode, advanceSlots.length],
  );

  // ── Buy ──
  const handleBuy = useCallback(
    async (useFreePoints = false) => {
      if (betList.length === 0) { alert('No bets placed!'); return; }
      if (selectedModes.size === 0) { alert('Select at least one mode.'); return; }

      if (!useFreePoints && totalCost > balance) {
        alert(`Insufficient points. Need: ${totalCost}, Have: ${balance}`);
        return;
      }

      setPlacingBet(true);
      const snapshot = [...betList];
      // Deduplicate by (number, betType) — SQL iterates over modes via p_draw_ids itself.
      const seen = new Set<string>();
      const expandedBets = snapshot
        .filter((b) => {
          const n = b.pairDigits ? completePairNumber(b.pairDigits, b.betType) : b.number;
          const key = `${n}-${b.betType}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((b) => ({
          number: b.pairDigits ? completePairNumber(b.pairDigits, b.betType) : b.number,
          bet_type: b.betType,
          amount: b.amount,
        }));

      try {
        if (isAdvanceMode) {
          // ── ADVANCE MODE: call place_advance_3d_bets ──
          const barcodes = advanceSlots.map((_, i) =>
            `ADV3D${Date.now().toString().slice(-8)}${String(i).padStart(2, '0')}`
          );

          const todayIso = new Date().toISOString().slice(0, 10);
          const { data, error } = await Promise.race([
            supabase.rpc('place_advance_3d_bets', {
              p_draw_date: todayIso,
              p_slot_labels: advanceSlots,
              p_modes: Array.from(selectedModes),
              p_bets: expandedBets,
              p_receipt_barcodes: barcodes,
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Request timed out. Please try again.')), 30000)
            ),
          ]);

          if (error) {
            alert(`Error placing advance bets: ${error.message}`);
            await refreshProfile();
            return;
          }

          const slotResults = Array.isArray(data) ? data : [];
          if (slotResults.length > 0) {
            setLastTransId(barcodes[0].slice(-8));
          }

          // Generate one receipt per slot and open combined window
          const allHtmlParts: string[] = [];
          for (const slotResult of slotResults) {
            const html = generate3DReceiptHtml({
              bets: snapshot,
              modes: Array.from(selectedModes),
              desk: profile?.username ?? barcodes[0].slice(-8),
              drawDate: today,
              drawTime: formatSlotLabelAsRange(slotResult.slot_label ?? '', 15).split(' - ')[1] ?? slotResult.slot_label ?? '',
              barcode: slotResult.barcode ?? '',
              username,
            });
            allHtmlParts.push(html);

            // Upload receipt per slot (fire-and-forget)
            if (user?.id && slotResult.barcode) {
              void (async () => {
                try {
                  const url = await uploadReceiptToStorage(user.id, slotResult.barcode, html);
                  if (url) await save3DReceiptUrl(slotResult.barcode, url);
                } catch { /* non-fatal */ }
              })();
            }
          }

          // Open combined receipt window
          if (allHtmlParts.length > 0) {
            const combined = allHtmlParts.join('<hr style="margin:20px 0;border:2px dashed #999;">');
            const wrapper = `<!doctype html><html><head><meta charset="utf-8"/><title>Advance 3D Receipts</title></head><body style="font-family:Arial,sans-serif;background:#fff;color:#111">${combined}</body></html>`;
            if (!open3DReceiptWindow(wrapper)) {
              alert('Bets placed! (Receipt popup blocked — allow popups)');
            }
          }

          setBetList([]);
          await refreshProfile();
          setAdvanceSlots([]);
          return;
        }

        // ── NORMAL MODE: call place_3d_bet_bulk ──
        const activeModeDrawIds: Record<string, string> = {};
        for (const m of selectedModes) {
          const id = drawIds[m];
          if (!id) { alert(`No open draw for mode ${m}. Please wait.`); return; }
          activeModeDrawIds[m] = id;
        }

        const barcode = `3D-${Date.now().toString().slice(-10)}-${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`;

        const { data, error } = await Promise.race([
          supabase.rpc('place_3d_bet_bulk', {
            p_draw_ids: activeModeDrawIds,
            p_bets: expandedBets,
            p_receipt_barcode: barcode,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out. Please try again.')), 20000)
          ),
        ]);

        if (error) {
          alert(`Error placing bets: ${error.message}`);
          await refreshProfile();
          return;
        }

        const rows = Array.isArray(data) ? data : [];
        const transId = (rows[0]?.id || barcode).slice(-8);
        setLastTransId(transId);

        const html = generate3DReceiptHtml({
          bets: snapshot,
          modes: [...selectedModes],
          desk: profile?.username ?? barcode.slice(-8),
          drawDate: today,
          drawTime: dbSlotLabel || slotLabel,
          barcode,
          username,
        });

        if (!open3DReceiptWindow(html)) {
          alert('Bet placed! (Receipt popup blocked — allow popups)');
        }

        setBetList([]);
        await refreshProfile();

        void (async () => {
          if (!user?.id) return;
          try {
            const url = await uploadReceiptToStorage(user.id, barcode, html);
            if (url) await save3DReceiptUrl(barcode, url);
          } catch { /* non-fatal */ }
        })();
      } catch (err: unknown) {
        alert((err as Error).message ?? 'Unexpected error. Please try again.');
        await refreshProfile().catch(() => {});
      } finally {
        setPlacingBet(false);
      }
    },
    [betList, selectedModes, activeBetTypes, drawIds, balance, totalCost, refreshProfile, profile, user, today, slotLabel, dbSlotLabel, username, isAdvanceMode, advanceSlots],
  );

  // ── Last draw display ──
  const isDrawOpen = drawIds.A !== null || drawIds.B !== null || drawIds.C !== null;
  const countdownRed = countdown <= 30;

  return (
    <div className="t3-root">
      <Terminal3DStyles />

      {/* ── Advance Mode Banner ── */}
      {isAdvanceMode && (
        <div style={{
          background: 'linear-gradient(135deg, #7b1fa2, #4a148c)',
          color: '#fff',
          padding: '12px 16px',
          fontWeight: 800,
          fontSize: 13,
          textAlign: 'center',
          letterSpacing: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>⚡ ADVANCE MODE</span>
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 4 }}>
              {advanceSlots.length} SLOT{advanceSlots.length !== 1 ? 'S' : ''} × {selectedModes.size} MODE{selectedModes.size !== 1 ? 'S' : ''}
            </span>
            <button
              type="button"
              onClick={() => setAdvanceSlots([])}
              style={{
                background: '#e53935',
                border: 'none',
                color: '#fff',
                padding: '3px 10px',
                borderRadius: 4,
                fontWeight: 800,
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              EXIT
            </button>
          </div>
          <div style={{ fontSize: '12px', opacity: 1, fontWeight: 800 }}>
            SELECTED SLOTS: {advanceSlots.map((l) => formatSlotLabelAsRange(l, 15).split(' - ')[1] ?? l).join(', ')}
          </div>
        </div>
      )}

      {/* ── Advance Draw Modal ── */}
      {showAdvanceModal3D && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
          <div style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 10px 36px rgba(0,0,0,0.32)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #e0e0e0' }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1a1a' }}>Advance Draw</div>
                <div style={{ fontSize: 13, color: '#666', marginTop: 3 }}>Remaining Draw: {availableAdvSlots3D.length}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    const ordered = availableAdvSlots3D
                      .filter((s) => modal3DSelectedDraws.has(s.label))
                      .map((s) => s.label);
                    setAdvanceSlots(ordered);
                    setShowAdvanceModal3D(false);
                  }}
                  disabled={modal3DSelectedDraws.size === 0}
                  style={{ background: modal3DSelectedDraws.size === 0 ? '#ccc' : '#1565c0', color: '#fff', border: 'none', borderRadius: 5, padding: '10px 22px', fontWeight: 800, fontSize: 14, cursor: modal3DSelectedDraws.size === 0 ? 'default' : 'pointer' }}
                >
                  OKAY
                </button>
                <button
                  onClick={() => setShowAdvanceModal3D(false)}
                  style={{ background: '#e0e0e0', color: '#333', border: 'none', borderRadius: 5, padding: '10px 18px', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
                >
                  CANCEL
                </button>
              </div>
            </div>
            <div style={{ padding: '18px 24px 10px', display: 'flex', gap: 10 }}>
              <input
                type="number"
                min={1}
                placeholder="Enter N (e.g. 5)"
                value={modal3DTopInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setModal3DTopInput(val);
                  const n = Number(val);
                  if (Number.isInteger(n) && n > 0) {
                    const top = availableAdvSlots3D.slice(0, Math.min(n, availableAdvSlots3D.length));
                    setModal3DSelectedDraws(new Set(top.map((s) => s.label)));
                  } else if (val.trim() === '') {
                    setModal3DSelectedDraws(new Set());
                  }
                }}
                style={{ flex: 1, border: '1px solid #ccc', borderRadius: 5, padding: '10px 12px', fontSize: 14 }}
              />
              <button
                onClick={() => setModal3DSelectedDraws(new Set(availableAdvSlots3D.map((s) => s.label)))}
                style={{ background: '#1565c0', color: '#fff', border: 'none', borderRadius: 5, padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              >
                Select All
              </button>
            </div>
            <div style={{ padding: '10px 24px 26px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {availableAdvSlots3D.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888', fontSize: 14, padding: '24px 0' }}>
                  No upcoming slots available today.
                </div>
              )}
              {availableAdvSlots3D.map((slot) => {
                const selected = modal3DSelectedDraws.has(slot.label);
                return (
                  <button
                    key={slot.label}
                    onClick={() => setModal3DSelectedDraws((prev) => {
                      const next = new Set(prev);
                      selected ? next.delete(slot.label) : next.add(slot.label);
                      return next;
                    })}
                    style={{
                      padding: '14px 8px',
                      border: selected ? '2px solid #1565c0' : '2px solid #ddd',
                      borderRadius: 5,
                      background: selected ? '#1565c0' : '#f5f5f5',
                      color: selected ? '#fff' : '#333',
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    {slot.displayLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Brand Banner (New) ── */}
      <div className="t3-brand-banner">
         <div className="t3-brand-left">
           <span className="digit-1">1</span>
           <span className="digit-2">2</span>
           <span className="digit-3">3</span>
         </div>
         <div className="t3-brand-title">3D GAME</div>
         <div className="t3-brand-right">
           <span className="digit-0">0</span>
           <span className="digit-1">1</span>
           <span className="digit-2">2</span>
         </div>
      </div>

      {/* ── Last Draw Header ── */}
      <div className="t3-last-draw-header">
        <div className="t3-last-draw-box">
          <span className="t3-last-draw-label">Last Draw</span>
          <span className="t3-last-draw-time">{lastResult.time || '--:--:-- PM'}</span>
        </div>
        
        <div className="t3-last-draw-results">
           <div className="t3-ldr-block t3-ldr-A">
              <div className="t3-ldr-title">A</div>
              <div className="t3-ldr-numbers">
                 <div className="ldr-box">{lastResult.numbers.A !== undefined ? formatNumber3D(lastResult.numbers.A)[0] : '-'}</div>
                 <div className="ldr-box">{lastResult.numbers.A !== undefined ? formatNumber3D(lastResult.numbers.A)[1] : '-'}</div>
                 <div className="ldr-box">{lastResult.numbers.A !== undefined ? formatNumber3D(lastResult.numbers.A)[2] : '-'}</div>
              </div>
           </div>
           
           <div className="t3-ldr-block t3-ldr-B">
              <div className="t3-ldr-title">B</div>
              <div className="t3-ldr-numbers">
                 <div className="ldr-box">{lastResult.numbers.B !== undefined ? formatNumber3D(lastResult.numbers.B)[0] : '-'}</div>
                 <div className="ldr-box">{lastResult.numbers.B !== undefined ? formatNumber3D(lastResult.numbers.B)[1] : '-'}</div>
                 <div className="ldr-box">{lastResult.numbers.B !== undefined ? formatNumber3D(lastResult.numbers.B)[2] : '-'}</div>
              </div>
           </div>

           <div className="t3-ldr-block t3-ldr-C">
              <div className="t3-ldr-title">C</div>
              <div className="t3-ldr-numbers">
                 <div className="ldr-box">{lastResult.numbers.C !== undefined ? formatNumber3D(lastResult.numbers.C)[0] : '-'}</div>
                 <div className="ldr-box">{lastResult.numbers.C !== undefined ? formatNumber3D(lastResult.numbers.C)[1] : '-'}</div>
                 <div className="ldr-box">{lastResult.numbers.C !== undefined ? formatNumber3D(lastResult.numbers.C)[2] : '-'}</div>
              </div>
           </div>
        </div>
      </div>


      {/* ── Info bar ── */}
      <div className="t3-infobar">
        <div className="t3-infobar-cell">
          <span className="t3-ib-label">Today:</span>
          <span className="t3-ib-value">{today}</span>
        </div>
        <div className="t3-infobar-cell">
          <span className="t3-ib-label">Current Time:</span>
          <span className="t3-ib-value">{currentTime}</span>
        </div>
        <div className="t3-infobar-cell" style={{ minWidth: isAdvanceMode ? '180px' : 'auto' }}>
          <span className="t3-ib-label">{isAdvanceMode ? 'Advance Slots:' : 'Current Timeslot:'}</span>
          <span className="t3-ib-value" style={{ 
            fontSize: isAdvanceMode ? '11px' : '14px',
            whiteSpace: isAdvanceMode ? 'normal' : 'nowrap',
            lineHeight: 1.1,
            display: 'inline-block',
            maxWidth: isAdvanceMode ? '250px' : 'none'
          }}>
            {isAdvanceMode ? advanceSlots.map((l) => formatSlotLabelAsRange(l, 15).split(' - ')[1] ?? l).join(', ') : slotLabel}
          </span>
        </div>
        <div className="t3-infobar-cell">
          <span className="t3-ib-label">Remain Time:</span>
          <span className={`t3-ib-value${countdownRed ? ' red' : ''}`}>
            {slotsOver ? nextSlotText || '--' : formatCountdown(countdown)}
          </span>
        </div>
      </div>

      {/* ── User bar + Nav ── */}
      <div className="t3-userbar">
        <div className="t3-user-pts">
          {username}({profile?.username ?? ''}) Free Points : {balance.toFixed(2)}
        </div>
        {NAV_TABS_3D.map(({ label, bg }) => {
          const isAdvTab = label === 'ADVANCE DRAW' && isAdvanceMode;
          return (
            <button
              key={label}
              type="button"
              className="t3-nav-btn"
              style={{ background: isAdvTab ? '#ff6f00' : bg }}
              onClick={() => handleTabClick(label)}
            >
              {isAdvTab ? `ADV - ${advanceSlots.length}` : label}
            </button>
          );
        })}
      </div>

      {/* ── Mode selector + game type switcher ── */}
      <div className="t3-controlbar">
        <ModeSelector
          selectedModes={selectedModes}
          onToggleMode={toggleMode}
          onToggleAll={toggleAllModes}
        />
        <div className="t3-gametype-group">
          <button type="button" className="t3-gametype-btn" onClick={() => navigate('/')}>2D</button>
          <button type="button" className="t3-gametype-btn active">3D</button>
        </div>
      </div>

      {/* ── Digit selector + Filters + Motor / Lucky Pick ── */}
      <div className="t3-digitbar">
        <DigitSelector
          selectedDigits={selectedDigits}
          highlightedDigits={highlightedDigits}
          onToggleDigit={toggleDigit}
          onToggleAll={toggleAllDigits}
        />
        <FilterSelector selectedFilters={selectedFilters} onToggle={toggleFilter} />
        <div className="t3-action-group">
          <button
            type="button"
            className={`t3-motor-btn ${isMotorMode ? 'active' : ''}`}
            style={isMotorMode ? { background: '#ff9800', color: '#fff', borderColor: '#f57c00' } : {}}
            onClick={handleMotor}
          >
            Motor
          </button>
          <div className="t3-qty-group">
            <span>Qty</span>
            <input
              type="number"
              className="t3-qty-input"
              min={1}
              max={1000}
              value={luckyCount}
              onChange={(e) => setLuckyCount(Math.max(1, parseInt(e.target.value, 10) || 0))}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLuckyPick(); }}
            />
          </div>
          <button type="button" className="t3-lucky-btn" onClick={handleLuckyPick}>LUCKY PICK</button>
        </div>
      </div>

      {/* ── Bet type selector ── */}
      <BetTypeSelector
        activeBetTypes={activeBetTypes}
        onToggle={toggleBetType}
        onToggleAll={toggleAllBetTypes}
        isMotorMode={isMotorMode}
      />

      {/* ── Input bar (Add Number + Range + Rate) ── */}
      <div className="t3-inputbar">
        <input
          className="t3-add-number-input"
          placeholder={
            isPairInput
              ? ([...activeBetTypes][0] === 'FP' ? '_ _ X'
                : [...activeBetTypes][0] === 'BP' ? 'X _ _'
                : [...activeBetTypes][0] === 'SP' ? '_ X _'
                : '_ _')
              : 'ADD NUMBER'
          }
          value={manualInput}
          maxLength={isPairInput ? 2 : 3}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '');
            setManualInput(val);
            const triggerLen = isPairInput ? 2 : 3;
            if (val.length === triggerLen) {
              const betTypesArray = isMotorMode ? ['STR' as BetType3D] : Array.from(activeBetTypes);
              setBetList((prev) => {
                const existing = new Set(prev.map((b) => `${b.number}-${b.mode}-${b.betType}`));
                const newEntries: BetListEntry[] = [];
                const modesArray = Array.from(selectedModes);
                for (const bt of betTypesArray) {
                  const n = isPairInput ? completePairNumber(val, bt) : parseInt(val, 10);
                  if (n < 0 || n > 999) continue;
                  for (const m of modesArray) {
                    if (existing.has(`${n}-${m}-${bt}`)) continue;
                    newEntries.push({
                      id: `${n}-${m}-${bt}-${Date.now()}-${Math.random()}`,
                      number: n,
                      betType: bt,
                      mode: m,
                      amount: rate,
                      ...(isPairInput ? { pairDigits: val } : {}),
                    });
                  }
                }
                return [...prev, ...newEntries];
              });
              setManualInput('');
            }
          }}
        />
        <div className="t3-range-group">
          <span>Range:</span>
          <input
            className="t3-range-input"
            placeholder="NUM."
            value={rangeFrom}
            onChange={(e) => setRangeFrom(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddRange(); }}
          />
          <span>To</span>
          <input
            className="t3-range-input"
            placeholder="NUM."
            value={rangeTo}
            onChange={(e) => setRangeTo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddRange(); }}
          />
          <button
            type="button"
            className="t3-manual-add-btn"
            onClick={handleAddRange}
          >
            Go
          </button>
        </div>
        <RateSelector rate={rate} onChange={setRate} />
      </div>

      {/* ── Main Scroll Area (matches 2D behavior) ── */}
      <div className="t3-main-scroll">
        {/* ── Bet list ── */}
        <BetList betList={betList} onRemove={removeBet} />

        {/* ── Footer ── */}
        <div className="t3-footer">
          <div className="t3-footer-total">{totalCost}</div>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: '12px', fontWeight: 900, color: '#333', marginLeft: '10px' }}>
            <span>Last Transaction:</span>
            <span style={{ color: '#2e7d32', fontSize: '14px' }}>{lastTransId ? `#${lastTransId}` : '---'}</span>
          </div>
          <input className="t3-footer-barcode" placeholder="Barcode" style={{ marginLeft: 'auto' }} readOnly />
          <button type="button" className="t3-footer-btn howto" onClick={() => setShowHowToPlay(true)}>
            How To Play
          </button>
          <button type="button" className="t3-footer-btn logout" onClick={() => signOut()}>Logout (F8)</button>
          <button
            type="button"
            className="t3-footer-btn freebuy"
            onClick={() => handleBuy(true)}
            disabled={placingBet || betList.length === 0 || slotsOver || !isDrawOpen}
          >
            {placingBet ? 'Placing…' : 'Free BUY-F6'}
          </button>
        </div>
      </div>

      {showHowToPlay && (
        <div
          className="t3-howto-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="How To Play"
          onClick={() => setShowHowToPlay(false)}
        >
          <div className="t3-howto-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="t3-howto-close"
              aria-label="Close"
              onClick={() => setShowHowToPlay(false)}
            >
              x
            </button>
            <div className="t3-howto-title">How To Play</div>
            <table className="t3-howto-table">
              <thead>
                <tr>
                  <th>PLAYS</th>
                  <th>NO.</th>
                  <th>IF LUCKY COUPON DRAWS</th>
                  <th>POINTS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Straight</td>
                  <td>1 2 3</td>
                  <td>
                    <div className="t3-howto-draw t3-howto-draw-group">
                      <span className="t3-dot">1</span>
                      <span className="t3-dot">2</span>
                      <span className="t3-dot">3</span>
                      <span className="t3-howto-note">Only Exact Match Wins</span>
                    </div>
                  </td>
                  <td>900X10=9000</td>
                </tr>
                <tr>
                  <td>Box-3-Way</td>
                  <td>1 1 2</td>
                  <td>
                    <div className="t3-howto-draw t3-howto-draw-group">
                      <span className="t3-dot">1</span>
                      <span className="t3-dot">1</span>
                      <span className="t3-dot">2</span>
                      <span className="t3-dot">1</span>
                      <span className="t3-dot">2</span>
                      <span className="t3-dot">1</span>
                      <span className="t3-dot">2</span>
                      <span className="t3-dot">1</span>
                      <span className="t3-dot">1</span>
                    </div>
                  </td>
                  <td>300X10=3000</td>
                </tr>
                <tr>
                  <td>Box-6-Way</td>
                  <td>1 2 3</td>
                  <td>
                    <div className="t3-howto-draw">
                      <span className="t3-dot">1</span>
                      <span className="t3-dot">2</span>
                      <span className="t3-dot">3</span>
                      <span className="t3-dot">3</span>
                      <span className="t3-dot">2</span>
                      <span className="t3-dot">1</span>
                      <span className="t3-dot">3</span>
                      <span className="t3-dot">1</span>
                      <span className="t3-dot">2</span>
                    </div>
                    <div className="t3-howto-draw">
                      <span className="t3-dot">1</span>
                      <span className="t3-dot">3</span>
                      <span className="t3-dot">2</span>
                      <span className="t3-dot">2</span>
                      <span className="t3-dot">1</span>
                      <span className="t3-dot">3</span>
                      <span className="t3-dot">2</span>
                      <span className="t3-dot">3</span>
                      <span className="t3-dot">1</span>
                    </div>
                  </td>
                  <td>150X10=1500</td>
                </tr>
                <tr>
                  <td>Front Pair</td>
                  <td>1 2 X</td>
                  <td>
                    <div className="t3-howto-draw">
                      <span className="t3-dot">1</span>
                      <span className="t3-dot">2</span>
                      <span className="t3-dot">X</span>
                    </div>
                  </td>
                  <td>90X10=900</td>
                </tr>
                <tr>
                  <td>Back Pair</td>
                  <td>X 2 3</td>
                  <td>
                    <div className="t3-howto-draw">
                      <span className="t3-dot">X</span>
                      <span className="t3-dot">2</span>
                      <span className="t3-dot">3</span>
                    </div>
                  </td>
                  <td>90X10=900</td>
                </tr>
                <tr>
                  <td>Split Pair</td>
                  <td>1 X 3</td>
                  <td>
                    <div className="t3-howto-draw">
                      <span className="t3-dot">1</span>
                      <span className="t3-dot">X</span>
                      <span className="t3-dot">3</span>
                    </div>
                  </td>
                  <td>90X10=900</td>
                </tr>
                <tr>
                  <td>Any Pair</td>
                  <td>X 2 3</td>
                  <td>
                    <div className="t3-howto-draw">
                      <span className="t3-dot">X</span>
                      <span className="t3-dot">2</span>
                      <span className="t3-dot">3</span>
                      <span className="t3-dot">2</span>
                      <span className="t3-dot">X</span>
                      <span className="t3-dot">3</span>
                      <span className="t3-dot">2</span>
                      <span className="t3-dot">3</span>
                      <span className="t3-dot">X</span>
                    </div>
                  </td>
                  <td>30X10=300</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lottery3DTerminal;