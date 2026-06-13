import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { openStoredReceiptWindow } from '../features/lottery/receipt';

interface CancelableBet {
  bet_id: string;
  barcode: string | null;
  number: number | null;
  bet_type: string | null;
  quantity: number | null;
  points_cost: number | null;
  status: string | null;
  placed_at: string | null;
  draw_date: string | null;
  slot_label: string | null;
  is_cancellable: boolean | null;
  receipt_url: string | null;
}

interface CancelableGroup {
  key: string;
  barcode: string | null;
  betType: string | null;
  quantity: number;
  points: number;
  slotLabel: string | null;
  placedAt: string | null;
  isCancellable: boolean;
  betIds: string[];
  receiptUrl: string | null;
}

interface Cancelable3DBet {
  bet_id: string;
  barcode: string | null;
  number: number | null;
  bet_type: string | null;
  amount: number | null;
  points_cost: number | null;
  status: string | null;
  placed_at: string | null;
  draw_date: string | null;
  mode: string | null;
  slot_label: string | null;
  is_cancellable: boolean | null;
  receipt_url: string | null;
}

interface Cancelable3DGroup {
  key: string;
  barcode: string | null;
  betTypes: string[];
  modes: string[];
  amount: number;
  points: number;
  drawDate: string | null;
  slotLabel: string | null;
  placedAt: string | null;
  isCancellable: boolean;
  betIds: string[];
  receiptUrl: string | null;
}

interface CancelRow {
  key: string;
  barcode: string | null;
  betTypes: string[];
  modes: string[];
  stake: number;
  points: number;
  slotLabel: string | null;
  placedAt: string | null;
  isCancellable: boolean;
  betIds: string[];
  receiptUrl?: string | null;
  source: '2D' | '3D';
}

export const CancelTicketPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshProfile, user } = useAuth();
  const [tickets, setTickets] = useState<CancelableBet[]>([]);
  const [tickets3d, setTickets3d] = useState<Cancelable3DBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const initialGameType = (location.state as { gameType?: string } | null)?.gameType === '3D' ? '3D' : '2D';
  const [gameType, setGameType] = useState<'2D' | '3D'>(initialGameType);

  const fetchCancelable = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_bet_history')
        .select('*')
        .eq('is_cancellable', true)
        .order('placed_at', { ascending: false })
        .order('barcode', { ascending: false })
        .order('number', { ascending: true });

      if (error) {
        console.error('Error fetching cancelable bets:', error.message);
      } else {
        setTickets(data ?? []);
      }
    } catch (err) {
      console.error('Unexpected error fetching cancelable bets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCancelable3D = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_3d_bet_history')
        .select('*')
        .eq('is_cancellable', true)
        .order('placed_at', { ascending: false });
      if (error) console.error('Error fetching 3D cancellable bets:', error.message);
      else setTickets3d(data ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    if (gameType === '2D') fetchCancelable();
    else fetchCancelable3D();
  }, [user?.id, gameType, fetchCancelable, fetchCancelable3D]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTs(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('cancel-bets-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bets',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchCancelable();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, fetchCancelable]);

  const getSlotEndTime = (placedAt: string | null, slotMinutes = 15) => {
    if (!placedAt) return null;
    const placed = new Date(placedAt);
    if (Number.isNaN(placed.getTime())) return null;

    const start = new Date(placed);
    start.setSeconds(0, 0);
    start.setMinutes(Math.floor(start.getMinutes() / slotMinutes) * slotMinutes);

    return new Date(start.getTime() + slotMinutes * 60 * 1000);
  };

  const isSlotExpired = (placedAt: string | null, nowMs: number, slotMinutes = 15) => {
    const end = getSlotEndTime(placedAt, slotMinutes);
    if (!end) return false;
    return nowMs >= end.getTime();
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleString('en-GB', { hour12: true });
  };

  const formatSlotEndTime = (placedAt: string | null, slotMinutes = 15, fallbackSlotLabel: string | null = null) => {
    const end = getSlotEndTime(placedAt, slotMinutes);
    if (end) {
      return end.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    if (fallbackSlotLabel) {
      const match = fallbackSlotLabel.match(/-\s*(\d{1,2}:\d{2}\s*[AP]M)/i);
      if (match) return match[1].toUpperCase();
    }
    return '--';
  };

  const groupedRows: CancelableGroup[] = useMemo(() => {
    const groups = new Map<string, CancelableGroup>();

    tickets.forEach((ticket, index) => {
      const key = ticket.barcode ?? `NO_BARCODE_${index}`;
      const existing = groups.get(key);

      if (!existing) {
        groups.set(key, {
          key,
          barcode: ticket.barcode,
          betType: ticket.bet_type,
          quantity: ticket.quantity ?? 0,
          points: ticket.points_cost ?? 0,
          slotLabel: ticket.slot_label,
          placedAt: ticket.placed_at,
          isCancellable: !!ticket.is_cancellable,
          betIds: ticket.is_cancellable ? [ticket.bet_id] : [],
          receiptUrl: ticket.receipt_url ?? null,
        });
        return;
      }

      existing.quantity += ticket.quantity ?? 0;
      existing.points += ticket.points_cost ?? 0;
      existing.isCancellable = existing.isCancellable || !!ticket.is_cancellable;

      if (ticket.is_cancellable) {
        existing.betIds.push(ticket.bet_id);
      }
    });

    return Array.from(groups.values());
  }, [tickets]);

  const groupedRows3D: Cancelable3DGroup[] = useMemo(() => {
    const groups = new Map<string, Cancelable3DGroup>();

    tickets3d.forEach((ticket, index) => {
      const key = ticket.barcode ?? `NO_BARCODE_3D_${index}`;
      const existing = groups.get(key);

      if (!existing) {
        groups.set(key, {
          key,
          barcode: ticket.barcode,
          betTypes: ticket.bet_type ? [ticket.bet_type] : [],
          modes: ticket.mode ? [ticket.mode] : [],
          amount: ticket.amount ?? 0,
          points: ticket.points_cost ?? 0,
          drawDate: ticket.draw_date,
          slotLabel: ticket.slot_label,
          placedAt: ticket.placed_at,
          isCancellable: !!ticket.is_cancellable,
          betIds: ticket.is_cancellable ? [ticket.bet_id] : [],
          receiptUrl: ticket.receipt_url ?? null,
        });
        return;
      }
      if (ticket.bet_type && !existing.betTypes.includes(ticket.bet_type)) {
        existing.betTypes.push(ticket.bet_type);
      }
      if (ticket.mode && !existing.modes.includes(ticket.mode)) {
        existing.modes.push(ticket.mode);
      }
      existing.amount += ticket.amount ?? 0;
      existing.points += ticket.points_cost ?? 0;
      existing.isCancellable = existing.isCancellable || !!ticket.is_cancellable;
      if (ticket.is_cancellable) {
        existing.betIds.push(ticket.bet_id);
      }
      if (!existing.receiptUrl && ticket.receipt_url) {
        existing.receiptUrl = ticket.receipt_url;
      }
    });

    return Array.from(groups.values()).filter((group) => !isSlotExpired(group.placedAt, nowTs));
  }, [tickets3d, nowTs]);

  const rows: CancelRow[] = useMemo(() => (
    gameType === '2D'
      ? groupedRows.map((row) => ({
        key: row.key,
        barcode: row.barcode,
        betTypes: row.betType ? [row.betType] : [],
        modes: [],
        stake: row.quantity,
        points: row.points,
        slotLabel: formatSlotEndTime(row.placedAt, 15, row.slotLabel),
        placedAt: row.placedAt,
        isCancellable: row.isCancellable,
        betIds: row.betIds,
        receiptUrl: row.receiptUrl,
        source: '2D',
      }))
      : groupedRows3D.map((row) => ({
        key: row.key,
        barcode: row.barcode,
        betTypes: row.betTypes,
        modes: row.modes,
        stake: row.amount,
        points: row.points,
        slotLabel: formatSlotEndTime(row.placedAt, 15, row.slotLabel),
        placedAt: row.placedAt,
        isCancellable: row.isCancellable,
        betIds: row.betIds,
        receiptUrl: row.receiptUrl,
        source: '3D',
      }))
  ), [gameType, groupedRows, groupedRows3D]);

  const handleCancelRow = useCallback(async (row: CancelRow) => {
    if (row.source === '3D') {
      if (!row.isCancellable || row.betIds.length === 0) return;
      if (isSlotExpired(row.placedAt, Date.now())) {
        alert('Cancel failed: draw time is over.');
        return;
      }

      setCancelling(row.key);
      let restoredPoints = 0;
      let needsFallback = false;

      for (const betId of row.betIds) {
        const { data, error } = await supabase.rpc('cancel_3d_bet', { p_bet_id: betId });
        if (error) {
          alert(`Cancel failed: ${error.message}`);
          setCancelling(null);
          return;
        }

        const rows3d = data as { points_restored?: number; new_balance?: number }[] | null;
        const result = Array.isArray(rows3d) ? rows3d[0] : rows3d;
        if (result?.points_restored != null) {
          restoredPoints += Number(result.points_restored) || 0;
        } else {
          needsFallback = true;
        }
      }

      if (restoredPoints === 0 && needsFallback) {
        restoredPoints = row.points > 0 ? row.points : row.stake;
      }

      alert(`3D bet cancelled! ${restoredPoints} points restored.`);
      await refreshProfile();
      await fetchCancelable3D();
      setCancelling(null);
      return;
    }

    if (!row.isCancellable || row.betIds.length === 0) return;

    setCancelling(row.key);
    let restoredPoints = 0;

    for (const betId of row.betIds) {
      const { data, error } = await supabase.rpc('cancel_bet', { p_bet_id: betId });
      if (error) {
        alert(`Cancel failed: ${error.message}`);
        setCancelling(null);
        return;
      }

      const result = data as { points_restored?: number; new_balance?: number };
      restoredPoints += result?.points_restored ?? 0;
    }

    alert(`Bet cancelled! ${restoredPoints} points restored.`);
    await refreshProfile();
    await fetchCancelable();
    setCancelling(null);
  }, [fetchCancelable, fetchCancelable3D, refreshProfile]);

  return (
    <>
      <style>{`
        .ctp-root {
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
          color: #1a1a1a;
          font-family: Arial, sans-serif;
        }
        .ctp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: #2a1a2e;
          border-bottom: 2px solid #1a1018;
        }
        .ctp-title {
          font-size: 14px;
          font-weight: 800;
          color: #ffd700;
          letter-spacing: 2px;
          margin: 0;
        }
        .ctp-back {
          background: #cc1111;
          border: 2px solid #9e0d0d;
          color: #fff;
          padding: 6px 14px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          font-family: inherit;
          transition: filter 0.15s;
        }
        .ctp-back:hover { filter: brightness(1.12); }

        .ctp-content {
          padding: 16px;
        }
        .ctp-card {
          background: #d0c8c0;
          border: 2px solid #8c847c;
          border-radius: 8px;
          overflow: hidden;
        }
        .ctp-table-wrap {
          overflow-x: auto;
        }
        .ctp-table {
          width: 100%;
          border-collapse: collapse;
          background: #d0c8c0;
        }
        .ctp-table th {
          background: #2a1a2e;
          color: #fff;
          text-align: left;
          padding: 10px 12px;
          font-weight: 800;
          font-size: 10px;
          border-bottom: 2px solid #1a1018;
          white-space: nowrap;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .ctp-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #b8b0a8;
          font-size: 11px;
          vertical-align: top;
          color: #1f1f1f;
        }
        .ctp-table tr:hover td {
          background: rgba(0, 0, 0, 0.03);
        }
        .ctp-table td:nth-child(1) {
          color: #2a1a2e;
          font-weight: 700;
        }
        .ctp-cancel-btn {
          background: #cc1111;
          color: #fff;
          border: 2px solid #9e0d0d;
          border-radius: 4px;
          padding: 4px 10px;
          font-size: 9px;
          font-weight: 800;
          cursor: pointer;
          font-family: inherit;
        }
        .ctp-cancel-btn:hover { filter: brightness(1.15); }
        .ctp-cancel-btn:disabled { opacity: 0.6; cursor: wait; }
        .ctp-receipt-link {
          display: inline-block;
          margin-top: 5px;
          font-size: 9px;
          font-weight: 700;
          color: #1565c0;
          text-decoration: none;
          border: 1px solid #90caf9;
          background: #e3f2fd;
          padding: 2px 7px;
          border-radius: 3px;
          letter-spacing: 0.4px;
          cursor: pointer;
          font-family: inherit;
        }
        .ctp-receipt-link:hover { background: #bbdefb; }
        .ctp-tag {
          display: inline-block;
          padding: 4px 9px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #991b1b;
          background: #fee2e2;
          border: 1px solid #fecaca;
        }
        .ctp-row-empty td { text-align: center; color: #666; padding: 24px 12px; }
        .ctp-gametab-bar { display:flex; gap:0; border-bottom:2px solid #1a1018; }
        .ctp-gametab { padding:8px 22px; background:#3a2a44; color:#aaa; border:none; font-family:inherit;
          font-size:12px; font-weight:800; cursor:pointer; letter-spacing:1px; text-transform:uppercase; }
        .ctp-gametab.active { background:#2a1a2e; color:#ffd700; border-bottom:2px solid #ffd700; }
        .ctp-gametab:hover:not(.active) { background:#4a3a54; }
        .ctp-mode-badge { display:inline-block; padding:2px 7px; border-radius:3px; font-size:11px; font-weight:800; margin-right:6px; }
        .ctp-mode-A { background:#0a2210; color:#22ff22; border:1px solid #22aa22; }
        .ctp-mode-B { background:#220a0a; color:#ff4444; border:1px solid #cc2222; }
        .ctp-mode-C { background:#0a1030; color:#4488ff; border:1px solid #2266cc; }
        @media (max-width: 1px) {
          .ctp-table th,
          .ctp-table td {
            font-size: 10px;
            padding: 10px;
          }
        }
        .ctp-header-spacer { width: 60px; flex-shrink: 0; }
        @media (max-width: 1px) {
          html, body, #root { overflow-x: hidden; overflow-y: auto; height: auto; min-height: 100%; }
          .ctp-root { min-height: 100dvh; overflow-x: hidden; width: 100%; }
          .ctp-header-spacer { width: 30px; }
          .ctp-header { padding: 8px 10px; }
          .ctp-back { padding: 4px 8px; font-size: 9px; }
          .ctp-title { font-size: 10px; letter-spacing: 1px; }
          .ctp-content { padding: 8px 6px; }
          .ctp-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .ctp-table { width: 100%; min-width: unset !important; table-layout: auto; }
          .ctp-table th { font-size: 7px; padding: 5px 3px; letter-spacing: 0; }
          .ctp-table td { font-size: 8px; padding: 5px 3px; }
          .ctp-cancel-btn { padding: 3px 6px; font-size: 7px; }
          .ctp-receipt-link { font-size: 7px; padding: 1px 4px; }
          .ctp-tag { font-size: 7px; padding: 2px 5px; }
          .ctp-gametab-bar { flex-wrap: wrap; }
          .ctp-gametab { flex: 1 1 auto; min-width: 0; padding: 6px 10px; font-size: 10px; }
          .ctp-mode-badge { font-size: 8px; padding: 1px 4px; margin-right: 3px; }
        }
      `}</style>

      <div className="ctp-root terminal-theme-bg">
        <div className="ctp-header terminal-page-header">
          <button className="ctp-back terminal-btn-red" onClick={() => navigate(gameType === '3D' ? '/3d' : '/')}>{'<'} BACK</button>
          <span className="ctp-title terminal-page-title">CANCEL TICKET</span>
          <div className="ctp-header-spacer" />
        </div>
        <div className="ctp-gametab-bar">
          <button className={`ctp-gametab${gameType === '2D' ? ' active' : ''}`} onClick={() => setGameType('2D')}>2D Game</button>
          <button className={`ctp-gametab${gameType === '3D' ? ' active' : ''}`} onClick={() => setGameType('3D')}>3D Game</button>
        </div>

        <div className="ctp-content">
          <div className="ctp-card terminal-card">
            <div className="ctp-table-wrap">
              <table className="ctp-table terminal-table">
                <thead>
                  <tr>
                    <th>Barcode</th>
                    <th>Type</th>
                    {gameType === '3D' && <th>Mode</th>}
                    <th>Qty/Amount</th>
                    <th>Points</th>
                    <th>Slot</th>
                    <th>Placed At</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr className="ctp-row-empty">
                      <td colSpan={gameType === '3D' ? 8 : 7}>Loading...</td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr className="ctp-row-empty">
                      <td colSpan={gameType === '3D' ? 8 : 7}>{gameType === '3D' ? 'No cancellable 3D tickets found.' : 'No cancellable tickets found.'}</td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.key}>
                        <td>{row.barcode ?? '--'}</td>
                        <td>{row.betTypes.length > 0 ? row.betTypes.join(', ') : '--'}</td>
                        {gameType === '3D' && (
                          <td>
                            {row.modes.length > 0 ? (
                              row.modes
                                .slice()
                                .sort()
                                .map((mode) => (
                                  <span key={mode} className={`ctp-mode-badge ctp-mode-${mode}`}>{mode}</span>
                                ))
                            ) : '--'}
                          </td>
                        )}
                        <td>{row.stake > 0 ? row.stake : '--'}</td>
                        <td>{row.points > 0 ? row.points : '--'}</td>
                        <td>{row.slotLabel ?? '--'}</td>
                        <td>{formatDateTime(row.placedAt)}</td>
                        <td>
                          {row.isCancellable ? (
                            <button
                              className="ctp-cancel-btn"
                              onClick={() => handleCancelRow(row)}
                              disabled={cancelling === row.key}
                            >
                              {cancelling === row.key ? '...' : 'CANCEL'}
                            </button>
                          ) : (
                            <span className="ctp-tag">Cancelled</span>
                          )}
                          {row.receiptUrl && (
                            <button
                              className="ctp-receipt-link"
                              onClick={() => openStoredReceiptWindow(row.receiptUrl!)}
                            >
                              📄 Receipt
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
