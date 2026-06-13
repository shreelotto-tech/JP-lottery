import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { formatSlotLabelAsRange } from '../features/lottery/utils';
import { openStoredReceiptWindow, generateWinReceiptHtml, generateWin3DReceiptHtml, uploadReceiptToStorage, generateReceiptHtml, saveReceiptUrlToBets } from '../features/lottery/receipt';
import { generate3DReceiptHtml } from '../features/lottery3d/receipt3d';
import type { BetType3D, Mode3D } from '../features/lottery3d/types';

interface BetHistoryRow {
  bet_id: string;
  barcode: string | null;
  number: number | null;
  bet_type: string | null;
  quantity: number | null;
  points_cost: number | null;
  status: string | null;
  payout: number | null;
  placed_at: string | null;
  draw_date: string | null;
  draw_time: string | null;
  slot_label: string | null;
  is_cancellable: boolean | null;
  is_claimable: boolean | null;
  receipt_url: string | null;
  win_receipt_url: string | null;
}

interface HistoryGroup {
  key: string;
  barcode: string | null;
  numbers: number[];
  betType: string | null;
  quantity: number;
  pointsCost: number;
  payout: number;
  placedAt: string | null;
  drawDate: string | null;
  slotLabel: string | null;
  status: string;
  isClaimable: boolean;
  claimableBetIds: string[];
  receiptUrl: string | null;
  winReceiptUrl: string | null;
}

interface Bet3DHistoryRow {
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
  draw_time: string | null;
  is_cancellable: boolean | null;
  is_claimable: boolean | null;
  receipt_url: string | null;
  win_receipt_url: string | null;
}

interface History3DGroup {
  key: string;
  barcode: string | null;
  numbers: number[];
  betTypes: string[];
  modes: string[];
  amount: number;
  payout: number;
  drawDate: string | null;
  slotLabel: string | null;
  status: string;
  isClaimable: boolean;
  claimableBetIds: string[];
  receiptUrl: string | null;
  winReceiptUrl: string | null;
}

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshProfile, user, profile } = useAuth();
  const [history, setHistory] = useState<BetHistoryRow[]>([]);
  const [history3d, setHistory3d] = useState<Bet3DHistoryRow[]>([]);
  const historyRef = useRef(history);
  const history3dRef = useRef(history3d);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { history3dRef.current = history3d; }, [history3d]);
  const [loadingCount, setLoadingCount] = useState(0);
  const loading = loadingCount > 0;
  const [claiming, setClaiming] = useState<string | null>(null);
  const [statsData, setStatsData] = useState<{ sell: number; win: number }>({ sell: 0, win: 0 });
  const today = new Date().toISOString().split('T')[0];
  const [selectedFromDate, setSelectedFromDate] = useState(today);
  const [selectedToDate, setSelectedToDate] = useState(today);
  const [appliedFromDate, setAppliedFromDate] = useState(today);
  const [appliedToDate, setAppliedToDate] = useState(today);
  const [currentPage, setCurrentPage] = useState(1);
  const initialGameType = (location.state as { gameType?: string } | null)?.gameType === '3D' ? '3D' : '2D';
  const [gameType, setGameType] = useState<'2D' | '3D'>(initialGameType);

  useEffect(() => {
    setCurrentPage(1);
  }, [gameType, appliedFromDate, appliedToDate]);

  const fetchHistory = useCallback(async () => {
    setLoadingCount((c) => c + 1);
    try {
      let query = supabase
        .from('user_bet_history')
        .select('*')
        .range(0, 99999)
        .order('draw_date', { ascending: false })
        .order('draw_time',  { ascending: false })
        .order('barcode',    { ascending: false })
        .order('number',     { ascending: true  });

      if (appliedFromDate) query = query.gte('draw_date', appliedFromDate);
      if (appliedToDate) query = query.lte('draw_date', appliedToDate);

      const { data, error } = await query;
      if (error) console.error('Error fetching history:', error.message);
      else setHistory(data ?? []);
    } catch (err) {
      console.error('Unexpected error fetching history:', err);
    } finally {
      setLoadingCount((c) => c - 1);
    }
  }, [appliedFromDate, appliedToDate]);

  const fetchHistory3D = useCallback(async () => {
    setLoadingCount((c) => c + 1);
    try {
      let query = supabase
        .from('user_3d_bet_history')
        .select('*')
        .range(0, 99999)
        .order('draw_date', { ascending: false })
        .order('draw_time',  { ascending: false });
      if (appliedFromDate) query = query.gte('draw_date', appliedFromDate);
      if (appliedToDate) query = query.lte('draw_date', appliedToDate);
      const { data, error } = await query;
      if (error) console.error('Error fetching 3D history:', error.message);
      else setHistory3d(data ?? []);
    } finally {
      setLoadingCount((c) => c - 1);
    }
  }, [appliedFromDate, appliedToDate]);

  const fetchStats = useCallback(async () => {
    const params: Record<string, string> = {};
    if (appliedFromDate) params.p_from_date = appliedFromDate;
    if (appliedToDate)   params.p_to_date   = appliedToDate;
    const { data, error } = await supabase.rpc('get_user_stats', params);
    if (error) {
      console.error('Error fetching stats:', error.message);
      return;
    }
    if (data?.[0]) {
      const row = data[0];
      setStatsData({
        sell: Number(row.sell_2d ?? 0) + Number(row.sell_3d ?? 0),
        win:  Number(row.win_2d  ?? 0) + Number(row.win_3d  ?? 0),
      });
    }
  }, [appliedFromDate, appliedToDate]);

  useEffect(() => {
    if (!user?.id) return;
    fetchHistory();
    fetchHistory3D();
    fetchStats();
  }, [user?.id, fetchHistory, fetchHistory3D, fetchStats]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('history-bets-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bets',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchHistory();
        fetchStats();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bets_3d',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchHistory3D();
        fetchStats();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, fetchHistory, fetchHistory3D, fetchStats]);

  const handleClaim3DGroup = useCallback(async (group: History3DGroup) => {
    if (!group.isClaimable || group.claimableBetIds.length === 0) return;

    setClaiming(group.key);

    if (group.barcode) {
      const claimableIdSet = new Set(group.claimableBetIds);
      const winningBets = history3d
        .filter((r) => r.bet_id && claimableIdSet.has(r.bet_id))
        .map((r) => ({
          number: r.number!,
          mode: r.mode!,
          betType: r.bet_type!,
          payout: r.payout!,
        }));

      const winHtml = generateWin3DReceiptHtml({
        winningBets,
        barcode: group.barcode,
        drawDate: group.drawDate ?? '',
        slotLabel: group.slotLabel ?? '',
        totalPayout: group.payout,
      });

      const blob = new Blob([winHtml], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      const popup = window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
      if (!popup) { /* popup blocked — receipt still uploaded to storage below */ }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const winUrl = await uploadReceiptToStorage(user.id, `${group.barcode}_win_3d`, winHtml);
        if (winUrl) {
          const { error: updateError } = await supabase.from('bets_3d').update({ win_receipt_url: winUrl }).eq('barcode', group.barcode);
          if (updateError) {
             console.error("Failed to update win_receipt_url:", updateError);
          }
        }
      }
    }

    for (const betId of group.claimableBetIds) {
      const { error } = await supabase.rpc('claim_3d_winnings', { p_bet_id: betId });
      if (error) {
        alert(`Claim failed: ${error.message}`);
        setClaiming(null);
        return;
      }
    }

    await refreshProfile();
    await Promise.all([fetchHistory3D(), fetchStats()]);
    setClaiming(null);
  }, [refreshProfile, fetchHistory3D, fetchStats, history3d]);

  const handleClaimGroup = useCallback(async (group: HistoryGroup) => {
    if (!group.isClaimable || group.claimableBetIds.length === 0) return;

    setClaiming(group.key);

    // Generate and upload win receipt
    if (group.barcode) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const claimableIdSet = new Set(group.claimableBetIds);
        const winningNumbers = history
          .filter((r) => r.bet_id && claimableIdSet.has(r.bet_id) && r.number !== null)
          .map((r) => r.number as number);
        const winHtml = generateWinReceiptHtml({
          winningNumbers,
          barcode: group.barcode,
          drawDate: group.drawDate ?? '',
          slotLabel: group.slotLabel ?? '',
          totalPayout: group.payout,
          winningCount: group.claimableBetIds.length,
        });
        const winUrl = await uploadReceiptToStorage(user.id, `${group.barcode}_win`, winHtml);
        if (winUrl) {
          const { error: updateError } = await supabase.from('bets').update({ win_receipt_url: winUrl }).eq('barcode', group.barcode);
          if (updateError) {
             console.error("Failed to update win_receipt_url for 2D:", updateError);
          }
        }
      }
    }

    for (const betId of group.claimableBetIds) {
      const { error } = await supabase.rpc('claim_winnings', { p_bet_id: betId });
      if (error) {
        alert(`Claim failed: ${error.message}`);
        setClaiming(null);
        return;
      }
    }

    await refreshProfile();
    await Promise.all([fetchHistory(), fetchStats()]);
    setClaiming(null);
  }, [refreshProfile, fetchHistory, fetchStats, history]);

  const handlePrintMissing2D = useCallback(async (group: HistoryGroup) => {
    if (!user?.id || !group.barcode) return;
    const filePath = `${user.id}/${group.barcode}.html`;
    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(filePath);
    const storageUrl = urlData.publicUrl;
    try {
      const res = await fetch(storageUrl, { method: 'HEAD' });
      if (res.ok) {
        await saveReceiptUrlToBets(group.barcode, storageUrl);
        setHistory(prev => prev.map(r => r.barcode === group.barcode ? { ...r, receipt_url: storageUrl } : r));
        openStoredReceiptWindow(storageUrl);
        return;
      }
      // non-ok (e.g. 404) → file not in storage, fall through to regenerate
    } catch {
      // network / CORS error — can't confirm file is absent, bail out to avoid overwriting
      return;
    }

    // Fix #4: guard quantity !== null so nulls don't silently corrupt totals
    const betsForGroup = historyRef.current.filter(
      r => r.barcode === group.barcode && r.number !== null && r.quantity !== null,
    );
    if (betsForGroup.length === 0) return;
    const first = betsForGroup[0];
    const html = generateReceiptHtml({
      bets: betsForGroup.map(r => ({ number: r.number!, quantity: r.quantity! })),
      desk: profile?.points ?? 0,
      selectedGroupLabels: '',
      selectedModsText: first.bet_type ?? '',
      drawDate: first.draw_date ?? undefined,
      drawEndTime: first.slot_label ? formatSlotLabelAsRange(first.slot_label, 15).split(' - ').pop() : undefined,
      receiptBarcode: group.barcode,
    });
    const url = await uploadReceiptToStorage(user.id, group.barcode, html);
    if (url) {
      await saveReceiptUrlToBets(group.barcode, url);
      setHistory(prev => prev.map(r => r.barcode === group.barcode ? { ...r, receipt_url: url } : r));
      openStoredReceiptWindow(url);
    }
  }, [user?.id, profile]);

  const handlePrintMissing3D = useCallback(async (group: History3DGroup) => {
    if (!user?.id || !group.barcode) return;
    const filePath = `${user.id}/${group.barcode}.html`;
    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(filePath);
    const storageUrl = urlData.publicUrl;
    try {
      const res = await fetch(storageUrl, { method: 'HEAD' });
      if (res.ok) {
        await supabase.rpc('update_3d_bet_receipt', { p_barcode: group.barcode, p_receipt_url: storageUrl });
        setHistory3d(prev => prev.map(r => r.barcode === group.barcode ? { ...r, receipt_url: storageUrl } : r));
        openStoredReceiptWindow(storageUrl);
        return;
      }
      // non-ok (e.g. 404) → file not in storage, fall through to regenerate
    } catch {
      // network / CORS error — can't confirm file is absent, bail out to avoid overwriting
      return;
    }

    const betsForGroup = history3dRef.current.filter(r => r.barcode === group.barcode && r.number !== null);
    if (betsForGroup.length === 0) return;
    const first = betsForGroup[0];
    const html = generate3DReceiptHtml({
      bets: betsForGroup.map(r => ({
        id: r.bet_id,
        number: r.number!,
        betType: (r.bet_type as BetType3D) ?? 'STR',
        mode: (r.mode as Mode3D) ?? 'A',
        amount: r.amount ?? 0,
      })),
      modes: [...new Set(betsForGroup.map(r => r.mode as Mode3D).filter(Boolean))],
      desk: profile?.username ?? group.barcode.slice(-8),
      drawDate: first.draw_date ?? '',
      drawTime: first.slot_label
        ? (formatSlotLabelAsRange(first.slot_label, 15).split(' - ')[1] ?? first.slot_label)
        : (first.draw_time ?? ''),
      barcode: group.barcode,
      username: profile?.username ?? '',
    });
    const url = await uploadReceiptToStorage(user.id, group.barcode, html);
    if (url) {
      await supabase.rpc('update_3d_bet_receipt', { p_barcode: group.barcode, p_receipt_url: url });
      setHistory3d(prev => prev.map(r => r.barcode === group.barcode ? { ...r, receipt_url: url } : r));
      openStoredReceiptWindow(url);
    }
  }, [user?.id, profile]);

  const filteredHistory = useMemo(() => history, [history]);

  const groupedHistory = useMemo<HistoryGroup[]>(() => {
    const groups = new Map<string, HistoryGroup>();

    const resolveStatus = (statuses: string[], isClaimable: boolean) => {
      if (isClaimable) return 'won';
      if (statuses.includes('claimed')) return 'claimed';
      if (statuses.includes('cancelled')) return 'cancelled';
      if (statuses.includes('pending')) return 'pending';
      if (statuses.includes('won')) return 'won';
      if (statuses.includes('lost')) return 'lost';
      return statuses[0] ?? 'pending';
    };

    filteredHistory.forEach((row, index) => {
      const key = row.barcode ?? `NO_BARCODE_${index}`;
      const existing = groups.get(key);

      if (!existing) {
        const initialStatuses = row.status ? [row.status] : [];
        groups.set(key, {
          key,
          barcode: row.barcode,
          numbers: row.number !== null ? [row.number] : [],
          betType: row.bet_type,
          quantity: row.quantity ?? 0,
          pointsCost: row.points_cost ?? 0,
          payout: row.payout ?? 0,
          placedAt: row.placed_at,
          drawDate: row.draw_date,
          slotLabel: row.slot_label,
          status: resolveStatus(initialStatuses, !!row.is_claimable),
          isClaimable: !!row.is_claimable,
          claimableBetIds: row.is_claimable ? [row.bet_id] : [],
          receiptUrl: row.receipt_url ?? null,
          winReceiptUrl: row.win_receipt_url ?? null,
        });
        return;
      }

      if (row.number !== null) {
        existing.numbers.push(row.number);
      }
      existing.quantity += row.quantity ?? 0;
      existing.pointsCost += row.points_cost ?? 0;
      existing.payout += row.payout ?? 0;
      existing.isClaimable = existing.isClaimable || !!row.is_claimable;
      if (row.status && !existing.status.includes(row.status)) {
        const statuses = [existing.status, row.status];
        existing.status = resolveStatus(statuses, existing.isClaimable);
      }
      if (row.is_claimable) {
        existing.claimableBetIds.push(row.bet_id);
      }
      if (!existing.winReceiptUrl && row.win_receipt_url) {
        existing.winReceiptUrl = row.win_receipt_url;
      } else if (!existing.winReceiptUrl && existing.status === 'claimed' && user?.id && existing.barcode) {
        const { data } = supabase.storage.from('receipts').getPublicUrl(`${user.id}/${existing.barcode}_win.html`);
        existing.winReceiptUrl = data.publicUrl;
      }
    });

    return Array.from(groups.values());
  }, [filteredHistory, user?.id]);

  const groupedHistory3D = useMemo<History3DGroup[]>(() => {
    const groups = new Map<string, History3DGroup>();

    const resolveStatus = (statuses: string[], isClaimable: boolean) => {
      if (isClaimable) return 'won';
      if (statuses.includes('claimed')) return 'claimed';
      if (statuses.includes('cancelled')) return 'cancelled';
      if (statuses.includes('pending') || statuses.includes('open')) return 'pending';
      if (statuses.includes('won')) return 'won';
      if (statuses.includes('lost')) return 'lost';
      const first = statuses[0];
      return first === 'open' ? 'pending' : (first ?? 'pending');
    };

    history3d.forEach((row, index) => {
      const key = row.barcode ?? `NO_BARCODE_3D_${index}`;
      const existing = groups.get(key);

      if (!existing) {
        const initialStatuses = row.status ? [row.status] : [];
        groups.set(key, {
          key,
          barcode: row.barcode,
          numbers: row.number !== null ? [row.number] : [],
          betTypes: row.bet_type ? [row.bet_type] : [],
          modes: row.mode ? [row.mode] : [],
          amount: row.amount ?? 0,
          payout: row.payout ?? 0,
          drawDate: row.draw_date,
          slotLabel: row.slot_label,
          status: resolveStatus(initialStatuses, !!row.is_claimable),
          isClaimable: !!row.is_claimable,
          claimableBetIds: row.is_claimable ? [row.bet_id] : [],
          receiptUrl: row.receipt_url ?? null,
          winReceiptUrl: row.win_receipt_url ?? null,
        });
        return;
      }

      if (row.number !== null) {
        existing.numbers.push(row.number);
      }
      if (row.bet_type && !existing.betTypes.includes(row.bet_type)) {
        existing.betTypes.push(row.bet_type);
      }
      if (row.mode && !existing.modes.includes(row.mode)) {
        existing.modes.push(row.mode);
      }
      existing.amount += row.amount ?? 0;
      existing.payout += row.payout ?? 0;
      existing.isClaimable = existing.isClaimable || !!row.is_claimable;
      if (row.status && !existing.status.includes(row.status)) {
        const statuses = [existing.status, row.status];
        existing.status = resolveStatus(statuses, existing.isClaimable);
      }
      if (row.is_claimable) {
        existing.claimableBetIds.push(row.bet_id);
      }
      if (!existing.receiptUrl && row.receipt_url) {
        existing.receiptUrl = row.receipt_url;
      }
      if (!existing.winReceiptUrl && row.win_receipt_url) {
        existing.winReceiptUrl = row.win_receipt_url;
      } else if (!existing.winReceiptUrl && existing.status === 'claimed' && user?.id && existing.barcode) {
        const { data } = supabase.storage.from('receipts').getPublicUrl(`${user.id}/${existing.barcode}_win_3d.html`);
        existing.winReceiptUrl = data.publicUrl;
      }
    });

    return Array.from(groups.values());
  }, [history3d, user?.id]);

  const visibleHistory = useMemo(
    () => groupedHistory.filter((g) => g.status !== 'cancelled'),
    [groupedHistory],
  );

  const visibleHistory3D = useMemo(
    () => groupedHistory3D.filter((g) => g.status !== 'cancelled'),
    [groupedHistory3D],
  );

  // Stats come from get_user_stats RPC — always accurate regardless of row count
  const combinedSell = statsData.sell;
  const combinedWinnings = statsData.win;

  const paginated3D = useMemo(() => {
    return visibleHistory3D.slice((currentPage - 1) * 15, currentPage * 15);
  }, [visibleHistory3D, currentPage]);

  const paginated2D = useMemo(() => {
    return visibleHistory.slice((currentPage - 1) * 15, currentPage * 15);
  }, [visibleHistory, currentPage]);

  const totalPages = Math.max(1, Math.ceil((gameType === '3D' ? visibleHistory3D.length : visibleHistory.length) / 15));

  return (
    <>
      <style>{`
        .hp-root {
          min-height: 100dvh;
          background:
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 0, 0, 0.015) 2px,
              rgba(0, 0, 0, 0.015) 4px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 3px,
              rgba(0, 0, 0, 0.01) 3px,
              rgba(0, 0, 0, 0.01) 6px
            ),
            linear-gradient(135deg, #ccc8c0 0%, #c0b8b0 50%, #c8c4bc 100%);
          font-family: Arial, sans-serif;
          color: #1a1a1a;
        }
        .hp-wrap {
          max-width: 1280px;
          margin: 0 auto;
          padding: 22px 18px 26px;
        }
        .hp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: #2a1a2e;
          border-bottom: 2px solid #1a1018;
        }
        .hp-title {
          font-size: 24px;
          font-weight: 800;
          color: #ffd700;
          letter-spacing: 2px;
          margin: 0;
        }
        .hp-back {
          background: #cc1111;
          border: 2px solid #9e0d0d;
          color: #fff;
          padding: 10px 20px;
          border-radius: 4px;
          font-size: 18px;
          font-weight: 800;
          cursor: pointer;
          font-family: inherit;
          transition: filter 0.15s;
        }
        .hp-back:hover { filter: brightness(1.12); }
        .hp-filter-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 22px;
          background: #d0c8c0;
          border: 2px solid #8c847c;
          border-radius: 8px;
          padding: 16px;
          margin-top: 2px;
        }
        .hp-scroll {
          max-height: none;
          overflow-y: visible;
          overflow-x: visible;
          padding-right: 2px;
        }
        .hp-scroll::-webkit-scrollbar {
          width: 10px;
        }
        .hp-scroll::-webkit-scrollbar-thumb {
          background: #8c847c;
          border-radius: 999px;
          border: 2px solid #c8c1b8;
        }
        .hp-scroll::-webkit-scrollbar-track {
          background: #cbc4bc;
        }
        .hp-date {
          height: 60px;
          min-width: 200px;
          padding: 0 16px;
          border: 2px solid #7777bb;
          border-radius: 3px;
          font-size: 20px;
          background: #fff;
          color: #1a1a1a;
          font-family: inherit;
          box-sizing: border-box;
          width: 100%;
        }
        .hp-date:focus {
          outline: none;
          border-color: #3333cc;
          box-shadow: 0 0 3px rgba(50, 50, 200, 0.25);
        }
        .hp-date-wrapper {
          position: relative;
          display: inline-block;
          min-width: 200px;
        }
        .hp-date-hidden {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
          z-index: 2;
        }
        .hp-date-display {
          pointer-events: none;
        }
        .hp-date-hidden:focus + .hp-date-display {
          outline: none;
          border-color: #3333cc;
          box-shadow: 0 0 3px rgba(50, 50, 200, 0.25);
        }
        .hp-go {
          height: 60px;
          min-width: 80px;
          border: 2px solid #9e0d0d;
          border-radius: 4px;
          background: #cc1111;
          color: #fff;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: 1px;
          cursor: pointer;
          padding: 0 24px;
          font-family: inherit;
        }
        .hp-go:hover {
          filter: brightness(1.1);
        }
        .hp-clear {
          height: 60px;
          border: 2px solid #8c847c;
          border-radius: 4px;
          background: #d8d0c8;
          color: #3a3a3a;
          cursor: pointer;
          padding: 0 20px;
          font-family: inherit;
          font-size: 18px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .hp-clear:hover {
          color: #1a1a1a;
          background: #e2dad2;
        }
        .hp-card {
          background: #d0c8c0;
          border: 2px solid #8c847c;
          border-radius: 8px;
          overflow: hidden;
        }
        .hp-table-wrap {
          overflow-x: auto;
        }
        .hp-table {
          width: 100%;
          border-collapse: collapse;
          background: #d0c8c0;
          table-layout: fixed;
        }
        .hp-table th {
          background: #2a1a2e;
          color: #fff;
          text-align: center;
          padding: 16px;
          font-weight: 800;
          font-size: 16px;
          border-bottom: 2px solid #1a1018;
          white-space: nowrap;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          position: sticky;
          top: 0;
          z-index: 2;
        }
        .hp-table td {
          padding: 16px;
          border-bottom: 1px solid #b8b0a8;
          font-size: 18px;
          vertical-align: top;
          color: #1f1f1f;
          line-height: 1.35;
          text-align: center;
        }
        .hp-summary-bar {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          padding: 10px 14px;
          background: #2a1a2e;
          border-radius: 6px;
          margin-bottom: 10px;
        }
        .hp-summary-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .hp-summary-label {
          font-size: 14px;
          font-weight: 700;
          color: #aaa;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .hp-summary-value {
          font-size: 24px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }
        .hp-summary-sell { color: #ffd700; }
        .hp-summary-win { color: #69f0ae; }

        .hp-col-barcode { width: 240px; }
        .hp-col-qty { width: 80px; }
        .hp-col-cost { width: 100px; }
        .hp-col-slot { width: 220px; }
        .hp-col-payout { width: 100px; }
        .hp-col-print { width: 100px; }
        .hp-col-claim { width: 120px; }

        .hp-text-center { text-align: center; }
        .hp-text-right { text-align: right; }
        .hp-text-mono { font-variant-numeric: tabular-nums; }

        .hp-number-cloud {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          max-width: 100%;
          justify-content: center;
        }
        .hp-number-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 34px;
          padding: 1px 5px;
          border: 1px solid #b8b0a8;
          border-radius: 4px;
          background: #d7d0c8;
          color: #2a1a2e;
          font-size: 10px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }
        .hp-slot {
          font-variant-numeric: tabular-nums;
          color: #6b3f00;
          font-weight: 700;
        }
        .hp-action-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          min-height: 44px;
          justify-content: center;
        }
        .hp-table tr:hover td {
          background: rgba(0, 0, 0, 0.03);
        }
        .hp-row-empty td {
          text-align: center;
          color: #666;
          padding: 24px 12px;
        }
        .hp-action {
          color: #0d47a1;
          cursor: pointer;
          font-weight: 700;
        }
        .hp-claim-btn {
          background: #1b5e20;
          color: #fff;
          border: 2px solid #145218;
          border-radius: 4px;
          padding: 3px 9px;
          font-size: 9px;
          font-weight: 800;
          cursor: pointer;
          font-family: inherit;
        }
        .hp-claim-btn:hover { filter: brightness(1.15); }
        .hp-claim-btn:disabled { opacity: 0.6; cursor: wait; }
        .hp-claim-claimed {
          color: #1b5e20;
          font-weight: 700;
        }
        .hp-claim-pending {
          color: #b71c1c;
          font-weight: 700;
        }
        .hp-status-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 3px;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
        }
        .hp-status-won { background: #e8f5e9; color: #1b5e20; border: 1px solid #a5d6a7; }
        .hp-status-lost { background: #fce4ec; color: #b71c1c; border: 1px solid #ef9a9a; }
        .hp-status-pending { background: #fff3e0; color: #e65100; border: 1px solid #ffcc80; }
        .hp-status-claimed { background: #e0f2f1; color: #004d40; border: 1px solid #80cbc4; }
        .hp-status-cancelled { background: #f3e5f5; color: #4a148c; border: 1px solid #ce93d8; }
        .hp-gametab-bar { display:flex; gap:0; margin-bottom:0; border-bottom:2px solid #1a1018; }
        .hp-gametab { padding:8px 22px; background:#3a2a44; color:#aaa; border:none; font-family:inherit;
          font-size:12px; font-weight:800; cursor:pointer; letter-spacing:1px; text-transform:uppercase; }
        .hp-gametab.active { background:#2a1a2e; color:#ffd700; border-bottom:2px solid #ffd700; }
        .hp-gametab:hover:not(.active) { background:#4a3a54; }
        .hp-3d-num { font-size:15px; font-weight:900; color:#2a1a2e; letter-spacing:2px; }
        .hp-mode-badge { display:inline-block; padding:2px 7px; border-radius:3px; font-size:11px; font-weight:800; }
        .hp-mode-A { background:#e6f3e6; color:#1b5e20; border:1px solid #9ccc9c; }
        .hp-mode-B { background:#f9e5e5; color:#b71c1c; border:1px solid #ef9a9a; }
        .hp-mode-C { background:#e6eef9; color:#1a237e; border:1px solid #9fa8da; }
        .hp-mode-stack { display:inline-flex; gap:4px; flex-wrap:wrap; justify-content:center; }
        .hp-table td:nth-child(1) { color: #2a1a2e; font-weight: 700; }
        .hp-receipt-link {
          display: inline-block;
          font-size: 9px;
          font-weight: 700;
          color: #1565c0;
          text-decoration: none;
          border: 1px solid #90caf9;
          background: #e3f2fd;
          padding: 2px 6px;
          border-radius: 3px;
          letter-spacing: 0.4px;
          cursor: pointer;
          font-family: inherit;
        }
        .hp-receipt-link:hover { background: #bbdefb; }
        .hp-header-spacer { width: 60px; flex-shrink: 0; }

        @media (max-width: 1px) {
          .hp-title {
            font-size: 13px;
          }
          .hp-table th,
          .hp-table td {
            font-size: 10px;
            padding: 7px;
          }
          .hp-number-pill {
            min-width: 32px;
            padding: 1px 4px;
            font-size: 10px;
          }
        }
        @media (max-width: 1px) {
          .hp-wrap {
            padding: 14px 10px 20px;
          }
          .hp-title {
            font-size: 12px;
          }
          .hp-date-wrapper {
            min-width: 120px;
            flex: 1;
          }
          .hp-date {
            min-width: 120px;
          }
          .hp-filter-row {
            margin-bottom: 12px;
          }
        }
        @media (max-width: 1px) {
          html, body, #root {
            overflow-x: hidden;
            overflow-y: auto;
            height: auto;
            min-height: 100%;
          }
          .hp-root {
            min-height: 100dvh;
            overflow-x: hidden;
            overflow-y: auto;
            width: 100%;
          }
          .hp-header-spacer { width: 30px; }
          .hp-wrap { padding: 8px 6px 16px; }
          .hp-header { padding: 8px 10px; }
          .hp-title { font-size: 10px; letter-spacing: 1px; }
          .hp-back { padding: 4px 8px; font-size: 9px; }
          .hp-filter-row {
            flex-wrap: wrap;
            gap: 6px;
            padding: 8px;
          }
          .hp-filter-row > span { font-size: 10px; }
          .hp-date-wrapper {
            min-width: 0;
            flex: 1 1 40%;
          }
          .hp-date {
            min-width: 0;
            width: 100%;
            height: 32px;
            font-size: 10px;
            padding: 0 6px;
          }
          .hp-go {
            height: 32px;
            min-width: 36px;
            padding: 0 10px;
            font-size: 9px;
          }
          .hp-clear {
            height: 32px;
            padding: 0 8px;
            font-size: 9px;
          }
          .hp-summary-bar {
            gap: 8px;
            padding: 8px 10px;
            flex-wrap: wrap;
          }
          .hp-summary-label { font-size: 7px; }
          .hp-summary-value { font-size: 12px; }
          .hp-scroll {
            max-height: none;
            overflow-y: visible;
          }
          .hp-table-wrap {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .hp-table {
            width: 100%;
            min-width: unset !important;
            table-layout: auto;
            font-size: 8px;
          }
          .hp-table th {
            font-size: 7px;
            padding: 4px 2px;
            letter-spacing: 0;
          }
          .hp-table td {
            font-size: 8px;
            padding: 4px 2px;
            line-height: 1.2;
          }
          .hp-col-barcode { width: auto; }
          .hp-col-qty { width: auto; }
          .hp-col-cost { width: auto; }
          .hp-col-slot { width: auto; }
          .hp-col-payout { width: auto; }
          .hp-col-print { width: auto; }
          .hp-col-claim { width: auto; }
          .hp-number-pill {
            min-width: 24px;
            padding: 0 2px;
            font-size: 7px;
          }
          .hp-status-badge {
            font-size: 7px;
            padding: 1px 4px;
          }
          .hp-claim-btn {
            padding: 2px 6px;
            font-size: 7px;
          }
          .hp-receipt-link {
            font-size: 7px;
            padding: 1px 4px;
          }
          .hp-gametab-bar { flex-wrap: wrap; }
          .hp-gametab {
            flex: 1 1 auto;
            min-width: 0;
            padding: 6px 10px;
            font-size: 10px;
          }
          .hp-3d-num { font-size: 11px; }
          .hp-mode-badge { font-size: 8px; padding: 1px 4px; }
          .hp-pagination {
            padding: 8px 10px !important;
            font-size: 10px;
          }
          .hp-pagination .terminal-btn-red {
            font-size: 9px;
            padding: 4px 8px;
          }
        }
      `}</style>

      <div className="hp-root terminal-theme-bg">
        <div className="hp-header terminal-page-header">
          <button className="hp-back terminal-btn-red" onClick={() => navigate(gameType === '3D' ? '/3d' : '/')}>{'<' } BACK</button>
          <span className="hp-title terminal-page-title">HISTORY</span>
          <div className="hp-header-spacer" />
        </div>
        <div className="hp-gametab-bar">
          <button className={`hp-gametab${gameType === '2D' ? ' active' : ''}`} onClick={() => setGameType('2D')}>2D Game</button>
          <button className={`hp-gametab${gameType === '3D' ? ' active' : ''}`} onClick={() => setGameType('3D')}>3D Game</button>
        </div>

        <div className="hp-wrap">
          <div className="hp-filter-row terminal-card" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>From:</span>
            <div className="hp-date-wrapper">
              <input
                className="hp-date-hidden"
                type="date"
                lang="en-GB"
                value={selectedFromDate}
                onChange={(e) => setSelectedFromDate(e.target.value)}
                onClick={(e) => {
                  try { e.currentTarget.showPicker(); } catch (err) {}
                }}
              />
              <input
                className="hp-date hp-date-display"
                type="text"
                placeholder="dd/mm/yyyy"
                readOnly
                value={selectedFromDate ? selectedFromDate.split('-').reverse().join('/') : ''}
              />
            </div>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>To:</span>
            <div className="hp-date-wrapper">
              <input
                className="hp-date-hidden"
                type="date"
                lang="en-GB"
                value={selectedToDate}
                onChange={(e) => setSelectedToDate(e.target.value)}
                onClick={(e) => {
                  try { e.currentTarget.showPicker(); } catch (err) {}
                }}
              />
              <input
                className="hp-date hp-date-display"
                type="text"
                placeholder="dd/mm/yyyy"
                readOnly
                value={selectedToDate ? selectedToDate.split('-').reverse().join('/') : ''}
              />
            </div>
            <button className="hp-go terminal-btn-red" onClick={() => {
              setAppliedFromDate(selectedFromDate);
              setAppliedToDate(selectedToDate);
            }}>GO</button>
            <button
              className="hp-clear"
              onClick={() => {
                setSelectedFromDate('');
                setSelectedToDate('');
                setAppliedFromDate('');
                setAppliedToDate('');
              }}
            >
              Clear
            </button>
          </div>

          <div className="hp-summary-bar">
            <div className="hp-summary-item">
              <span className="hp-summary-label">Total Sell</span>
              <span className="hp-summary-value hp-summary-sell">{combinedSell} pts</span>
            </div>
            <div className="hp-summary-item">
              <span className="hp-summary-label">Total Winning</span>
              <span className="hp-summary-value hp-summary-win">{combinedWinnings} pts</span>
            </div>
            <div className="hp-summary-item">
              <span className="hp-summary-label">Percentage</span>
              <span className="hp-summary-value" style={{ color: '#aaa' }}>{(profile?.percentage ?? 10) === 0 ? '--' : `${profile?.percentage ?? 10}%`}</span>
            </div>
            <div className="hp-summary-item">
              <span className="hp-summary-label">Net Pay</span>
              <span className="hp-summary-value" style={{ color: (profile?.percentage ?? 10) === 0 ? '#aaa' : (combinedSell * ((100 - (profile?.percentage ?? 10)) / 100) - combinedWinnings) >= 0 ? '#ff6b6b' : '#69f0ae' }}>
                {(profile?.percentage ?? 10) === 0 ? '--' : `${(combinedSell * ((100 - (profile?.percentage ?? 10)) / 100) - combinedWinnings).toFixed(2)} pts`}
              </span>
            </div>
          </div>

          <div className="hp-scroll">
            {gameType === '3D' ? (
              <div className="hp-card terminal-card">
                <div className="hp-table-wrap">
                  <table className="hp-table">
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Type</th>
                        <th>Mode</th>
                        <th>Amount</th>
                        <th>Draw Date</th>
                        <th>Draw Time</th>
                        <th>Status</th>
                        <th>Winnings</th>
                        <th>Print</th>
                        <th>Claim</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={10} style={{ textAlign: 'center', padding: 24, color: '#888' }}>Loading...</td></tr>
                      ) : paginated3D.length === 0 ? (
                        <tr><td colSpan={10} style={{ textAlign: 'center', padding: 24, color: '#888' }}>No 3D history found.</td></tr>
                      ) : (
                        paginated3D.map((row) => (
                          <tr key={row.key}>
                            <td style={{ color: '#1a1a1a', fontWeight: 700 }}>{row.barcode ?? '--'}</td>
                            <td style={{ fontWeight: 800 }}>
                              {row.betTypes.length > 0
                                ? row.betTypes
                                    .slice()
                                    .sort((a, b) => {
                                      const order = ['BOX', 'STR', 'FP', 'BP', 'SP', 'AP'];
                                      return order.indexOf(a) - order.indexOf(b);
                                    })
                                    .join(', ')
                                : '--'}
                            </td>
                            <td>
                              {row.modes.length > 0 ? (
                                <span className="hp-mode-stack">
                                  {row.modes
                                    .slice()
                                    .sort()
                                    .map((mode) => (
                                      <span key={mode} className={`hp-mode-badge hp-mode-${mode}`}>{mode}</span>
                                    ))}
                                </span>
                              ) : '--'}
                            </td>
                            <td>{row.amount > 0 ? row.amount : '--'}</td>
                            <td>{row.drawDate ?? '--'}</td>
                            <td style={{ color: '#6b3f00' }}>
                              {row.slotLabel
                                ? formatSlotLabelAsRange(row.slotLabel, 15).split(' - ').pop()
                                : '--'}
                            </td>
                            <td>
                              <span className={`hp-status-badge hp-status-${row.status ?? 'pending'}`}>
                                {row.status ?? '--'}
                              </span>
                            </td>
                            <td style={{ fontWeight: 800, color: '#1a1a1a' }}>
                              {row.payout > 0 ? row.payout : '--'}
                            </td>
                            <td className="hp-text-center">
                              {row.receiptUrl ? (
                                <button
                                  className="hp-receipt-link"
                                  onClick={() => handlePrintMissing3D(row)}
                                >
                                  Buy
                                </button>
                              ) : !row.winReceiptUrl ? (
                                <button
                                  className="hp-receipt-link"
                                  onClick={() => handlePrintMissing3D(row)}
                                >
                                  Print
                                </button>
                              ) : null}
                              {row.winReceiptUrl && (
                                <button
                                  className="hp-receipt-link"
                                  style={{ background: '#e8f5e9', borderColor: '#a5d6a7', color: '#1b5e20', marginLeft: 6 }}
                                  onClick={() => openStoredReceiptWindow(row.winReceiptUrl as string)}
                                >
                                  Win
                                </button>
                              )}
                            </td>
                            <td>
                              {row.isClaimable ? (
                                <button
                                  className="hp-claim-btn"
                                  onClick={() => handleClaim3DGroup(row)}
                                  disabled={claiming === row.key}
                                >
                                  {claiming === row.key ? '...' : 'CLAIM'}
                                </button>
                              ) : row.status === 'claimed' ? (
                                <span className="hp-claim-claimed">Claimed ✓</span>
                              ) : row.status === 'lost' ? (
                                <span style={{ color: '#b71c1c', fontWeight: 700, fontSize: 10 }}>No Win</span>
                              ) : (
                                <span style={{ color: '#999' }}>--</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
            <div className="hp-card terminal-card">
              <div className="hp-table-wrap">
                <table className="hp-table terminal-table">
                  <colgroup>
                    <col className="hp-col-barcode" />
                    <col className="hp-col-qty" />
                    <col className="hp-col-cost" />
                    <col className="hp-col-slot" />
                    <col className="hp-col-payout" />
                    <col className="hp-col-print" />
                    <col className="hp-col-claim" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th className="hp-text-right">Qty. =</th>
                      <th className="hp-text-right">Point</th>
                      <th>Draw Time</th>
                      <th className="hp-text-right">Winning =</th>
                      <th className="hp-text-center">Print</th>
                      <th className="hp-text-center">Claim=</th>
                    </tr>
                  </thead>
                  <tbody>
                  {loading ? (
                    <tr className="hp-row-empty">
                      <td colSpan={7}>Loading...</td>
                    </tr>
                  ) : paginated2D.length === 0 ? (
                    <tr className="hp-row-empty">
                      <td colSpan={7}>No history found.</td>
                    </tr>
                  ) : (
                    paginated2D.map((bet) => (
                      <tr key={bet.key}>
                        <td className="hp-text-mono" style={{ fontWeight: 700 }}>{bet.barcode ?? '--'}</td>
                        <td className="hp-text-right hp-text-mono">{bet.quantity}</td>
                        <td className="hp-text-right hp-text-mono">{bet.pointsCost}</td>
                        <td className="hp-slot">{formatSlotLabelAsRange(bet.slotLabel, 15).split(' - ').pop()}</td>
                        <td className="hp-text-right hp-text-mono">
                          {bet.payout > 0 ? bet.payout : '--'}
                        </td>
                        <td className="hp-text-center">
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
                            {bet.receiptUrl ? (
                              <button
                                className="hp-receipt-link"
                                onClick={() => handlePrintMissing2D(bet)}
                              >
                                Buy
                              </button>
                            ) : !bet.winReceiptUrl ? (
                              <button
                                className="hp-receipt-link"
                                onClick={() => handlePrintMissing2D(bet)}
                              >
                                Print
                              </button>
                            ) : null}
                            {bet.winReceiptUrl && (
                              <button
                                className="hp-receipt-link"
                                style={{ background: '#e8f5e9', borderColor: '#a5d6a7', color: '#1b5e20' }}
                                onClick={() => openStoredReceiptWindow(bet.winReceiptUrl as string)}
                              >
                                Win
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="hp-text-center">
                          <div className="hp-action-cell">
                            {bet.isClaimable ? (
                              <button
                                className="hp-claim-btn"
                                onClick={() => handleClaimGroup(bet)}
                                disabled={claiming === bet.key}
                              >
                                {claiming === bet.key ? '...' : 'CLAIM'}
                              </button>
                            ) : bet.status === 'claimed' ? (
                              <span className="hp-claim-claimed">Claimed ✓</span>
                            ) : bet.status === 'lost' ? (
                              <span style={{ color: '#b71c1c', fontWeight: 700, fontSize: 10 }}>No Wins</span>
                            ) : (
                              <span style={{ color: '#999' }}>--</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </div>

          <div className="hp-pagination terminal-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', padding: '10px 15px' }}>
            <button 
              className="terminal-btn-red" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={{ opacity: currentPage === 1 ? 0.5 : 1 }}
            >
              Previous
            </button>
            <span style={{ fontWeight: 600, color: '#1a1a1a' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button 
              className="terminal-btn-red" 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={{ opacity: currentPage === totalPages ? 0.5 : 1 }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
