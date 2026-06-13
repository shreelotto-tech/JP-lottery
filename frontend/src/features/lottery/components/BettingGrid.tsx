import React, { useEffect, useState, useMemo } from 'react';
import type { BlockData, GridData, SeriesItem } from '../types';
import { supabase } from '../../../lib/supabase';

interface BettingGridProps {
  gridRef: React.RefObject<HTMLDivElement | null>;
  activeDrawId: string | null;
  activeSeries: string;
  activeSeriesInfo: SeriesItem;
  grids: Record<string, GridData>;
  blockData: Record<string, BlockData>;
  columnData: Record<string, Record<number, number>>;
  totalQt: number;
  totalAmount: number;
  getRowQt: (sid: string, row: number) => number;
  getRowAmount: (sid: string, row: number) => number;
  isCellDisabled: (actualNumber: number) => boolean;
  isBlockDisabled: boolean;
  isColumnDisabled: boolean;
  handleBlockChange: (sid: string, row: number, value: number) => void;
  handleColumnChange: (sid: string, col: number, value: number) => void;
  handleCellChange: (sid: string, row: number, col: number, value: number) => void;
  onFreeBuyNow: () => void;
  onLogout?: () => void;
  placingBet?: boolean;
  countdown?: number;
}

const BettingGrid: React.FC<BettingGridProps> = ({
  gridRef,
  activeDrawId,
  activeSeries,
  activeSeriesInfo,
  grids,
  blockData,
  columnData,
  totalQt,
  totalAmount,
  getRowQt,
  getRowAmount,
  isCellDisabled,
  isBlockDisabled,
  isColumnDisabled,
  handleBlockChange,
  handleColumnChange,
  handleCellChange,
  onFreeBuyNow,
  onLogout,
  placingBet,
  countdown,
}) => {
  const [winningNumbers, setWinningNumbers] = useState<number[]>([]);

  // Lock betting for the last 30 seconds of the slot
  const isBettingLocked = useMemo(() => {
    return countdown !== undefined && countdown <= 30 && countdown > 0;
  }, [countdown]);

  // Only reveal winning numbers after the slot has officially ended
  const visibleWinningNumbers = useMemo(() => {
    if (countdown === undefined || countdown > 0) return [];
    return winningNumbers;
  }, [winningNumbers, countdown]);

  useEffect(() => {
    if (!activeDrawId) {
      setWinningNumbers([]);
      return;
    }

    const channel = supabase
      .channel(`draw-results-${activeDrawId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'draws',
        filter: `id=eq.${activeDrawId}`
      }, (payload) => {
        if (payload.new.status === 'resulted' && payload.new.result_numbers) {
          setWinningNumbers(payload.new.result_numbers);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeDrawId]);

  return (
    <div className="lt-grid-scroll" ref={gridRef}>
      <table className="lt-grid-table">
        <thead>
          {/* Row of column digit labels (0–9) above the header */}
          <tr className="row-nums">
            <th className="lt-col-rowlabel"></th>
            <th className="lt-col-block"></th>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((col) => (
              <th key={col} className="lt-col-digit">{col}</th>
            ))}
            <th className="lt-col-qty"></th>
            <th className="lt-col-amt"></th>
          </tr>
          {/* Label row: BLOCK / B0..9 / Qty / Amount */}
          <tr className="row-labels">
            <th className="lt-col-rowlabel"></th>
            <th className="col-block lt-col-block">BLOCK</th>
            {/* B0 is actually the "fill column" input – label it B0 */}
            <th className="lt-col-digit">B0</th>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <th key={n} className="lt-col-digit">{n}</th>
            ))}
            <th className="col-qty lt-col-qty">Qty</th>
            <th className="col-amt lt-col-amt">Amount</th>
          </tr>
        </thead>
        <tbody>
          {/* Fill-column row (BLOCK row with B0..9 fill inputs) */}
          <tr className="lt-fill-row" style={{ background: 'rgba(0,0,0,0.04)', borderBottom: '2px solid #a09890' }}>
            <td className="lt-row-label"></td>
            <td style={{ textAlign: 'center' }}>
              {/* Block fill-all input */}
              <input
                type="number"
                min={0}
                className="lt-block-input"
                disabled={isBlockDisabled}
                value={''}
                onChange={() => { }}
              />
            </td>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((col) => (
              <td key={col}>
                <input
                  type="number"
                  min={0}
                  className="lt-fill-col-input"
                  disabled={isColumnDisabled}
                  value={columnData[activeSeries]?.[col] || ''}
                  onChange={(e) =>
                    handleColumnChange(activeSeries, col, parseInt(e.target.value, 10) || 0)
                  }
                  title="Fill entire column"
                />
              </td>
            ))}
            <td></td>
            <td></td>
          </tr>

          {/* Data rows F0–F9 */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((row) => {
            const qt = getRowQt(activeSeries, row);
            const amt = getRowAmount(activeSeries, row);
            return (
              <tr key={row} className="lt-data-row">
                {/* Row label */}
                <td className="lt-row-label">F{row}</td>

                {/* Block input */}
                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                  <input
                    type="number"
                    min={0}
                    className="lt-block-input"
                    disabled={isBlockDisabled}
                    value={blockData[activeSeries]?.[row] || ''}
                    onChange={(e) =>
                      handleBlockChange(activeSeries, row, parseInt(e.target.value, 10) || 0)
                    }
                  />
                </td>

                {/* 10 digit cells */}
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((col) => {
                  const val = grids[activeSeries]?.[row]?.[col] || 0;
                  const actualNumber = activeSeriesInfo.base + row * 10 + col;
                  const disabled = isCellDisabled(actualNumber);
                  const isWinning = visibleWinningNumbers.includes(actualNumber);

                  return (
                    <td key={col} title={`#${actualNumber}`} style={{ verticalAlign: 'top', paddingTop: 3 }}>
                      {/* Number label above input */}
                      <div className="lt-cell-number-strip">
                        <span className="lt-cell-number" style={isWinning ? { color: '#fff', background: activeSeriesInfo.color, padding: '0 4px', borderRadius: 3 } : {}}>
                          {actualNumber}
                        </span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        className={`lt-cell-input${val > 0 ? ' filled' : ''}`}
                        disabled={disabled}
                        value={val || ''}
                        onChange={(e) =>
                          handleCellChange(activeSeries, row, col, parseInt(e.target.value, 10) || 0)
                        }
                        style={isWinning ? { borderColor: activeSeriesInfo.color, borderWidth: 3, boxShadow: `0 0 8px ${activeSeriesInfo.color}88` } : {}}
                      />
                    </td>
                  );
                })}

                {/* Row totals */}
                <td className="lt-qty-val">{qt || 0}</td>
                <td className="lt-amt-val">{amt || 0}</td>
              </tr>
            );
          })}

          {/* Grand total row */}
          <tr className="lt-total-row">
            <td colSpan={2} className="lt-total-label">TOTAL</td>
            <td colSpan={10}></td>
            <td className="lt-qty-val"></td>
            <td className="lt-amt-val"></td>
          </tr>
        </tbody>
      </table>

      <div className="lt-grid-footer-inline">
        <div className="lt-footer">
          <button
            className="lt-footer-btn"
            style={{ background: '#cc1144' }}
            onClick={onLogout}
          >
            Logout<br />(F8)
          </button>
          <button className="lt-footer-btn" style={{ background: '#1f1f1f' }}>
            Change<br />Password
          </button>
          <div className="lt-footer-mid">
            <div className="lt-footer-txn">
              <div style={{ fontWeight: 700 }}>Last Transaction:</div>
              <div>#1528956879, Pt(2)</div>
            </div>
            <input type="text" className="lt-barcode-input" placeholder="Barcode" />
          </div>
          <button
            className="lt-buynow"
            style={{ background: placingBet ? '#774466' : isBettingLocked ? '#666666' : '#cc1199' }}
            onClick={onFreeBuyNow}
            disabled={placingBet || isBettingLocked}
          >
            {placingBet ? 'PLACING...' : isBettingLocked ? `LOCKED (${countdown}s)` : 'Free Buy Now (F6)'}
          </button>
          <div className="lt-footer-totals">
            <div className="lt-footer-total" style={{ background: '#228b22' }}>{totalQt}</div>
            <div className="lt-footer-total" style={{ background: '#228b22' }}>{totalAmount}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BettingGrid;