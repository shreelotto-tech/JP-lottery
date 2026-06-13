import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Mode3D } from '../features/lottery3d/types';
import { MODES_3D } from '../features/lottery3d/constants';

const START_HOUR = 8;
const START_MIN = 45;
const END_HOUR = 22;
const SLOT_INTERVAL_MIN = 15;

type DrawSlot = {
  label: string;
  displayLabel: string;
  minutes: number;
};

const formatTimeLabel = (hours24: number, minutes: number): string => {
  const suffix = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${suffix}`;
};

const buildAllSlots = (): DrawSlot[] => {
  const slots: DrawSlot[] = [];
  const startMinutes = START_HOUR * 60 + START_MIN;
  const endMinutes = END_HOUR * 60;

  for (let total = startMinutes; total <= endMinutes; total += SLOT_INTERVAL_MIN) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    const dt = total + SLOT_INTERVAL_MIN;
    const dh = Math.floor(dt / 60);
    const dm = dt % 60;
    slots.push({
      label: formatTimeLabel(h, m),
      displayLabel: formatTimeLabel(dh, dm),
      minutes: total,
    });
  }

  return slots;
};

const ALL_SLOTS = buildAllSlots();

export const AdvanceDraw3DPage: React.FC = () => {
  const navigate = useNavigate();
  const [nowMinutes, setNowMinutes] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
  const [selectedDraws, setSelectedDraws] = useState<Set<string>>(new Set());
  const [topCountInput, setTopCountInput] = useState<string>('');
  const [selectedModes, setSelectedModes] = useState<Set<Mode3D>>(new Set(['A', 'B', 'C']));

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    }, 30000);

    return () => clearInterval(id);
  }, []);

  const availableSlots = useMemo(
    () => ALL_SLOTS.filter((slot) => slot.minutes + SLOT_INTERVAL_MIN > nowMinutes),
    [nowMinutes]
  );

  useEffect(() => {
    setSelectedDraws((prev) => {
      const available = new Set(availableSlots.map((slot) => slot.label));
      const next = new Set(Array.from(prev).filter((slotLabel) => available.has(slotLabel)));
      return next;
    });
  }, [availableSlots]);

  const toggleDraw = (time: string) => {
    setSelectedDraws((prev) => {
      const next = new Set(prev);
      if (next.has(time)) {
        next.delete(time);
      } else {
        next.add(time);
      }
      return next;
    });
  };

  useEffect(() => {
    const count = Number(topCountInput);
    if (!Number.isInteger(count) || count <= 0) {
      if (topCountInput.trim() === '') {
        return;
      }
      setSelectedDraws(new Set());
      return;
    }

    const topSlots = availableSlots.slice(0, Math.min(count, availableSlots.length));
    setSelectedDraws(new Set(topSlots.map((slot) => slot.label)));
  }, [topCountInput, availableSlots]);

  const selectAll = () => {
    setSelectedDraws(new Set(availableSlots.map((slot) => slot.label)));
  };

  const clearAll = () => {
    setSelectedDraws(new Set());
  };

  // Mode selection
  const toggleMode = useCallback((m: Mode3D) => {
    setSelectedModes((prev) => {
      const next = new Set(prev);
      next.has(m) ? next.delete(m) : next.add(m);
      if (next.size === 0) next.add(m); // keep at least one
      return next;
    });
  }, []);

  const toggleAllModes = useCallback(() => {
    setSelectedModes((prev) =>
      prev.size === 3 ? new Set<Mode3D>(['A']) : new Set<Mode3D>(['A', 'B', 'C']),
    );
  }, []);

  const handleProceed = () => {
    if (selectedDraws.size > 0 && selectedModes.size > 0) {
      const ordered = availableSlots
        .map((slot) => slot.label)
        .filter((slotLabel) => selectedDraws.has(slotLabel));
      navigate('/3d', { state: { advanceSlots: ordered, advanceModes: [...selectedModes] } });
    }
  };

  return (
    <>
      <style>{`
        .adp3d-root {
          min-height: 100dvh;
          overflow-x: hidden;
          overflow-y: auto;
          width: 100%;
          padding-bottom: 40px;
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
        .adp3d-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: linear-gradient(135deg, #1a237e 0%, #311b92 100%);
          border-bottom: 2px solid #0d1257;
        }
        .adp3d-back {
          background: #cc1111;
          border: 2px solid #9e0d0d;
          color: #fff;
          padding: 6px 14px; border-radius: 4px;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          font-family: inherit; transition: filter 0.15s;
        }
        .adp3d-back:hover { filter: brightness(1.2); }
        .adp3d-back:active { transform: scale(0.96); }
        .adp3d-title {
          font-size: 14px;
          font-weight: 800;
          color: #ffd700;
          letter-spacing: 2px;
        }
        .adp3d-content {
          max-width: 520px;
          margin: 0 auto;
          padding: 20px 16px;
        }
        .adp3d-card {
          background: #d0c8c0;
          border: 2px solid #8c847c;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 16px;
        }
        .adp3d-card-title {
          font-size: 11px;
          font-weight: 800;
          color: #1a237e;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 16px;
        }
        .adp3d-actions {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 8px;
          margin-bottom: 12px;
          align-items: center;
        }
        .adp3d-top-input {
          width: 100%;
          min-width: 0;
          border: 2px solid #a09890;
          border-radius: 4px;
          background: #eee7df;
          padding: 10px 8px;
          font-size: 11px;
          font-weight: 700;
          color: #1a1a1a;
          font-family: inherit;
        }
        .adp3d-small-btn {
          border: 2px solid #8c847c;
          background: #d8d0c8;
          color: #1a1a1a;
          border-radius: 4px;
          padding: 10px 8px;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
        }
        .adp3d-small-btn:hover { filter: brightness(1.05); }
        .adp3d-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        .adp3d-slot {
          padding: 11px 8px;
          border: 2px solid #a09890;
          border-radius: 4px;
          background: #e0d8d0;
          color: #1a1a1a;
          font-size: 11px;
          font-weight: 700;
          text-align: center;
          cursor: pointer;
          font-family: inherit; transition: all 0.2s;
        }
        .adp3d-slot:hover {
          background: #e8e0d8;
        }
        .adp3d-slot.active {
          background: #1565c0;
          border-color: #0d47a1;
          color: #fff;
          box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.22);
        }

        /* Mode selector */
        .adp3d-mode-group {
          display: flex;
          gap: 10px;
          margin-top: 8px;
        }
        .adp3d-mode-btn {
          flex: 1;
          padding: 10px;
          border: 2px solid #a09890;
          border-radius: 4px;
          background: #e0d8d0;
          font-size: 12px;
          font-weight: 800;
          text-align: center;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .adp3d-mode-btn:hover { filter: brightness(1.05); }
        .adp3d-mode-btn.active-A {
          background: #22aa22; color: #fff; border-color: #1a8a1a;
        }
        .adp3d-mode-btn.active-B {
          background: #cc2222; color: #fff; border-color: #a01a1a;
        }
        .adp3d-mode-btn.active-C {
          background: #2266cc; color: #fff; border-color: #1a4ea0;
        }
        .adp3d-mode-btn.active-ALL {
          background: #7b1fa2; color: #fff; border-color: #5a1580;
        }

        .adp3d-selected {
          background: #d0c8c0;
          border: 2px solid #8c847c;
          border-radius: 8px;
          padding: 16px;
        }
        .adp3d-selected-label {
          font-size: 9px;
          color: #4a4a4a;
          text-transform: uppercase;
          letter-spacing: 1px; margin-bottom: 8px;
        }
        .adp3d-selected-time {
          font-size: 18px;
          font-weight: 800;
          color: #1a237e;
          margin-bottom: 12px;
          line-height: 1.35;
        }
        .adp3d-selected-modes {
          font-size: 12px;
          font-weight: 700;
          color: #333;
          margin-bottom: 12px;
        }
        .adp3d-proceed {
          width: 100%;
          padding: 12px;
          border: 2px solid #0d47a1;
          background: #1565c0;
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          border-radius: 4px;
          cursor: pointer;
          font-family: inherit; transition: all 0.2s;
          letter-spacing: 1px;
        }
        .adp3d-proceed:hover {
          filter: brightness(1.1);
        }
        .adp3d-proceed:active { transform: scale(0.97); }
        .adp3d-proceed:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .adp3d-header-spacer { width: 60px; flex-shrink: 0; }
        @media (max-width: 1px) {
          html, body, #root { overflow-x: hidden; overflow-y: auto; height: auto; min-height: 100%; }
          .adp3d-root { min-height: 100dvh; overflow-x: hidden; width: 100%; }
          .adp3d-header-spacer { width: 30px; }
          .adp3d-header { padding: 8px 10px; }
          .adp3d-back { padding: 4px 8px; font-size: 9px; }
          .adp3d-title { font-size: 10px; letter-spacing: 1px; }
          .adp3d-content { padding: 12px 8px; max-width: 100%; }
          .adp3d-card { padding: 12px; }
          .adp3d-card-title { font-size: 10px; margin-bottom: 10px; }
          .adp3d-actions { grid-template-columns: 1fr auto auto; gap: 6px; }
          .adp3d-top-input { font-size: 10px; padding: 8px 6px; }
          .adp3d-small-btn { font-size: 9px; padding: 8px 6px; }
          .adp3d-grid { grid-template-columns: repeat(3, 1fr); gap: 6px; }
          .adp3d-slot { padding: 9px 4px; font-size: 9px; }
          .adp3d-mode-group { gap: 6px; flex-wrap: wrap; }
          .adp3d-mode-btn { padding: 8px 6px; font-size: 10px; }
          .adp3d-selected { padding: 12px; }
          .adp3d-selected-label { font-size: 8px; }
          .adp3d-selected-modes { font-size: 10px; }
          .adp3d-selected-time { font-size: 14px; line-height: 1.3; }
          .adp3d-proceed { font-size: 11px; padding: 10px; }
        }
      `}</style>

      <div className="adp3d-root">
        <div className="adp3d-header">
          <button className="adp3d-back" onClick={() => navigate('/3d')}>{'<'} BACK</button>
          <span className="adp3d-title">3D ADVANCE DRAW</span>
          <div className="adp3d-header-spacer" />
        </div>

        <div className="adp3d-content">
          {/* Timeslot selection */}
          <div className="adp3d-card">
            <div className="adp3d-card-title">Select Draw Timeslots</div>
            <div className="adp3d-actions">
              <input
                type="number"
                min={1}
                className="adp3d-top-input"
                placeholder="Enter N (e.g. 5)"
                value={topCountInput}
                onChange={(e) => setTopCountInput(e.target.value)}
              />
              <button className="adp3d-small-btn" onClick={selectAll}>ALL</button>
              <button className="adp3d-small-btn" onClick={clearAll}>CLEAR</button>
            </div>
            <div className="adp3d-grid">
              {availableSlots.map((slot) => (
                <button
                  key={slot.label}
                  className={`adp3d-slot${selectedDraws.has(slot.label) ? ' active' : ''}`}
                  onClick={() => toggleDraw(slot.label)}
                >
                  {slot.displayLabel}
                </button>
              ))}
            </div>
            {availableSlots.length === 0 && (
              <div style={{ marginTop: 12, fontSize: 11, fontWeight: 700, color: '#5a2b2b' }}>
                No upcoming slots available today.
              </div>
            )}
          </div>

          {/* Mode selection */}
          <div className="adp3d-card">
            <div className="adp3d-card-title">Select Modes</div>
            <div className="adp3d-mode-group">
              <button
                type="button"
                className={`adp3d-mode-btn${selectedModes.size === 3 ? ' active-ALL' : ''}`}
                onClick={toggleAllModes}
              >
                <input
                  type="checkbox"
                  checked={selectedModes.size === 3}
                  onChange={toggleAllModes}
                  onClick={(e) => e.stopPropagation()}
                />
                ALL
              </button>
              {MODES_3D.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`adp3d-mode-btn${selectedModes.has(m) ? ` active-${m}` : ''}`}
                  onClick={() => toggleMode(m)}
                >
                  <input
                    type="checkbox"
                    checked={selectedModes.has(m)}
                    onChange={() => toggleMode(m)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Summary + Proceed */}
          {selectedDraws.size > 0 && selectedModes.size > 0 && (
            <div className="adp3d-selected">
              <div className="adp3d-selected-label">
                Selected: {selectedDraws.size} slot{selectedDraws.size !== 1 ? 's' : ''} × {selectedModes.size} mode{selectedModes.size !== 1 ? 's' : ''}
              </div>
              <div className="adp3d-selected-modes">
                Modes: {[...selectedModes].join(', ')}
              </div>
              <div className="adp3d-selected-time">
                {availableSlots
                  .filter((slot) => selectedDraws.has(slot.label))
                  .map((slot) => slot.displayLabel)
                  .join(', ')}
              </div>
              <button
                className="adp3d-proceed"
                onClick={handleProceed}
                disabled={selectedDraws.size === 0 || selectedModes.size === 0}
              >
                PROCEED TO 3D TERMINAL {'>'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
