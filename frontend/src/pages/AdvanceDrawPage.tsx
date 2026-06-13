import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

export const AdvanceDrawPage: React.FC = () => {
  const navigate = useNavigate();
  const [nowMinutes, setNowMinutes] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
  const [selectedDraws, setSelectedDraws] = useState<Set<string>>(new Set());
  const [topCountInput, setTopCountInput] = useState<string>('');

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

  const handleProceed = () => {
    if (selectedDraws.size > 0) {
      const ordered = availableSlots
        .map((slot) => slot.label)
        .filter((slotLabel) => selectedDraws.has(slotLabel));
      navigate('/', { state: { advanceSlots: ordered } });
    }
  };

  return (
    <>
      <style>{`
        .adp-root {
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
        .adp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: #2a1a2e;
          border-bottom: 2px solid #1a1018;
        }
        .adp-back {
          background: #cc1111;
          border: 2px solid #9e0d0d;
          color: #fff;
          padding: 6px 14px; border-radius: 4px;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          font-family: inherit; transition: filter 0.15s;
        }
        .adp-back:hover { filter: brightness(1.2); }
        .adp-back:active { transform: scale(0.96); }
        .adp-title {
          font-size: 14px;
          font-weight: 800;
          color: #ffd700;
          letter-spacing: 2px;
        }
        .adp-content {
          max-width: 520px;
          margin: 0 auto;
          padding: 20px 16px;
        }
        .adp-card {
          background: #d0c8c0;
          border: 2px solid #8c847c;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 16px;
        }
        .adp-card-title {
          font-size: 11px;
          font-weight: 800;
          color: #2a1a2e;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 16px;
        }
        .adp-actions {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 8px;
          margin-bottom: 12px;
          align-items: center;
        }
        .adp-top-input {
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
        .adp-small-btn {
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
        .adp-small-btn:hover { filter: brightness(1.05); }
        .adp-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        .adp-slot {
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
        .adp-slot:hover {
          background: #e8e0d8;
        }
        .adp-slot.active {
          background: #cc1199;
          border-color: #8b0d6c;
          color: #fff;
          box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.22);
        }
        .adp-selected {
          background: #d0c8c0;
          border: 2px solid #8c847c;
          border-radius: 8px;
          padding: 16px;
        }
        .adp-selected-label {
          font-size: 9px;
          color: #4a4a4a;
          text-transform: uppercase;
          letter-spacing: 1px; margin-bottom: 8px;
        }
        .adp-selected-time {
          font-size: 18px;
          font-weight: 800;
          color: #2a1a2e;
          margin-bottom: 12px;
          line-height: 1.35;
        }
        .adp-proceed {
          width: 100%;
          padding: 12px;
          border: 2px solid #8b0d6c;
          background: #cc1199;
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          border-radius: 4px;
          cursor: pointer;
          font-family: inherit; transition: all 0.2s;
          letter-spacing: 1px;
        }
        .adp-proceed:hover {
          filter: brightness(1.1);
        }
        .adp-proceed:active { transform: scale(0.97); }

        .adp-header-spacer { width: 60px; flex-shrink: 0; }
        @media (max-width: 1px) {
          html, body, #root { overflow-x: hidden; overflow-y: auto; height: auto; min-height: 100%; }
          .adp-root { min-height: 100dvh; overflow-x: hidden; width: 100%; }
          .adp-header-spacer { width: 30px; }
          .adp-header { padding: 8px 10px; }
          .adp-back { padding: 4px 8px; font-size: 9px; }
          .adp-title { font-size: 10px; letter-spacing: 1px; }
          .adp-content { padding: 12px 8px; max-width: 100%; }
          .adp-card { padding: 12px; }
          .adp-card-title { font-size: 10px; margin-bottom: 10px; }
          .adp-actions { grid-template-columns: 1fr auto auto; gap: 6px; }
          .adp-top-input { font-size: 10px; padding: 8px 6px; }
          .adp-small-btn { font-size: 9px; padding: 8px 6px; }
          .adp-grid { grid-template-columns: repeat(3, 1fr); gap: 6px; }
          .adp-slot { padding: 9px 4px; font-size: 9px; }
          .adp-selected { padding: 12px; }
          .adp-selected-label { font-size: 8px; }
          .adp-selected-time { font-size: 14px; line-height: 1.3; }
          .adp-proceed { font-size: 11px; padding: 10px; }
        }
      `}</style>

      <div className="adp-root terminal-theme-bg">
        <div className="adp-header terminal-page-header">
          <button className="adp-back terminal-btn-red" onClick={() => navigate('/')}>{'<'} BACK</button>
          <span className="adp-title terminal-page-title">ADVANCE DRAW</span>
          <div className="adp-header-spacer" />
        </div>

        <div className="adp-content">
          <div className="adp-card terminal-card">
            <div className="adp-card-title">Select Draw Timeslot</div>
            <div className="adp-actions">
              <input
                type="number"
                min={1}
                className="adp-top-input"
                placeholder="Enter N (e.g. 5)"
                value={topCountInput}
                onChange={(e) => setTopCountInput(e.target.value)}
              />
              <button className="adp-small-btn" onClick={selectAll}>ALL</button>
              <button className="adp-small-btn" onClick={clearAll}>CLEAR</button>
            </div>
            <div className="adp-grid">
              {availableSlots.map((slot) => (
                <button
                  key={slot.label}
                  className={`adp-slot${selectedDraws.has(slot.label) ? ' active' : ''}`}
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

          {selectedDraws.size > 0 && (
            <div className="adp-selected terminal-card">
              <div className="adp-selected-label">Selected Draws ({selectedDraws.size})</div>
              <div className="adp-selected-time">
                {availableSlots
                  .filter((slot) => selectedDraws.has(slot.label))
                  .map((slot) => slot.displayLabel)
                  .join(', ')}
              </div>
              <button className="adp-proceed" onClick={handleProceed}>
                PROCEED TO BUY {'>'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
