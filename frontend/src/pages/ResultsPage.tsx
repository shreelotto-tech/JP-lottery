import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface DrawResultRow {
  id: string;
  draw_date: string;
  scheduled_at: string;
  result_numbers: number[] | null;
  slot_label: string;
}

interface Draw3DSlot {
  scheduled_at: string;
  slot_label: string;
  results: { A?: number; B?: number; C?: number };
}

const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const shiftDate = (iso: string, days: number): string => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const displayDate = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00`);

  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).toUpperCase();
};

const getRows = (
  numbers: number[] | null
): [number[], number[], number[]] => {
  const arr =
    numbers && numbers.length >= 30
      ? numbers
      : [...(numbers ?? []), ...Array(30).fill(0)];

  return [arr.slice(0, 10), arr.slice(10, 20), arr.slice(20, 30)];
};

const ROW_COLORS = ['#a83232', '#2a7a2a', '#1a5fa8'];

const formatScheduledTime = (isoUtc: string): string =>
  new Date(isoUtc).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });

export const ResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<'2D' | '3D'>('2D');
  const [selectedDate, setSelectedDate] = useState<string>(todayISO);
  const [draws, setDraws] = useState<DrawResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [draws3d, setDraws3d] = useState<Draw3DSlot[]>([]);
  const [loading3d, setLoading3d] = useState(false);

  useEffect(() => {
    const requestedTab = (
      location.state as { activeTab?: '2D' | '3D' } | null
    )?.activeTab;

    if (requestedTab === '2D' || requestedTab === '3D') {
      setActiveTab(requestedTab);
    }
  }, [location.state]);

  // 2D FETCH
  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setDraws([]);

    const fetchDraws = async () => {
      const { data, error } = await supabase
        .from('draws')
        .select(
          'id, draw_date, scheduled_at, result_numbers, draw_timeslots(label)'
        )
        .eq('draw_date', selectedDate)
        .eq('status', 'resulted')
        .order('scheduled_at', { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error(error.message);
        setLoading(false);
        return;
      }

      const mapped = (data ?? []).map((d: any) => ({
        id: d.id,
        draw_date: d.draw_date,
        scheduled_at: d.scheduled_at,
        result_numbers: d.result_numbers,
        slot_label:
          (d.draw_timeslots as { label: string } | null)?.label ?? '--:--',
      }));

      setDraws(mapped);
      setLoading(false);
    };

    fetchDraws();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  // 3D FETCH
  useEffect(() => {
    if (activeTab !== '3D') return;

    let cancelled = false;

    setLoading3d(true);
    setDraws3d([]);

    const fetch3DDraws = async () => {
      const { data, error } = await supabase
        .from('draws_3d')
        .select(
          'mode, scheduled_at, draw_date, result_number, draw_timeslots(label)'
        )
        .eq('draw_date', selectedDate)
        .eq('status', 'resulted')
        .order('scheduled_at', { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error(error);
        setLoading3d(false);
        return;
      }

      const slotMap = new Map<string, Draw3DSlot>();

      (data ?? []).forEach((row: any) => {
        if (!slotMap.has(row.scheduled_at)) {
          slotMap.set(row.scheduled_at, {
            scheduled_at: row.scheduled_at,
            slot_label:
              (row.draw_timeslots as { label?: string } | null)?.label ??
              '--',
            results: {},
          });
        }

        const slot = slotMap.get(row.scheduled_at)!;

        if (
          (row.mode === 'A' ||
            row.mode === 'B' ||
            row.mode === 'C') &&
          row.result_number !== null
        ) {
          slot.results[row.mode as 'A' | 'B' | 'C'] =
            row.result_number;
        }
      });

      setDraws3d(Array.from(slotMap.values()));
      setLoading3d(false);
    };

    fetch3DDraws();

    return () => {
      cancelled = true;
    };
  }, [selectedDate, activeTab]);

  const canGoNext = selectedDate < todayISO();

  return (
    <>
      <style>{`
        .rp-root {
          min-height: 100vh;
          background: #e8e0d5;
          font-family: Arial, sans-serif;
          display: flex;
          flex-direction: column;
        }

        .rp-header {
          background: #241327;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-bottom: 2px solid #111;
        }

        .rp-back {
          background: #d62828;
          color: white;
          border: none;
          padding: 8px 14px;
          border-radius: 8px;
          font-weight: 800;
          cursor: pointer;
        }

        .rp-title {
          color: #ffd60a;
          font-size: 45px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .rp-header-spacer {
          width: 70px;
        }

        .rp-tabs {
          display: flex;
          background: #241327;
        }

        .rp-tab {
          flex: 1;
          padding: 12px;
          font-size: 24px;
          border: none;
          background: transparent;
          color: #888;
          font-weight: 900;
          cursor: pointer;
          letter-spacing: 2px;
        }

        .rp-tab.active {
          color: #ffd60a;
          border-bottom: 3px solid #ffd60a;
        }

        .rp-content {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex: 1;
        }

        .rp-date-nav {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          border-radius: 12px;
          background: #2a1a2e;
        }

        .rp-nav-btn {
          width: 38px;
          height: 38px;
          border: none;
          border-radius: 8px;
          background: #d62828;
          color: white;
          font-size: 20px;
          font-weight: 900;
          cursor: pointer;
        }

        .rp-date-input {
          height: 38px;
          border-radius: 8px;
          background: #fff;
          border: none;
          padding: 0 10px;
          color: black;
          font-size: 16px;
          font-family: inherit;
          font-weight: 700;
        }

        .rp-date-label {
          flex: 1;
          text-align: center;
          color: #ffd60a;
          font-size: 28px;
          font-weight: 800;
        }

        .rp-scroll {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .rp-empty {
          background: white;
          padding: 40px;
          text-align: center;
          border-radius: 12px;
          font-weight: 700;
        }

        /* =======================
           NEW 3D DESIGN (TABLE FORMAT)
        ======================== */

        .rp-3d-table {
          background: #111;
          border: 2px solid #fff;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }

        .rp-3d-thead {
          display: grid;
          grid-template-columns: 110px 1fr 1fr 1fr;
          border-bottom: 2px solid #fff;
        }

        .rp-3d-th {
          color: white;
          text-align: center;
          padding: 24px 8px;
          font-size: 28px;
          font-weight: 900;
          border-right: 2px solid #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .rp-3d-th:first-child {
          font-size: 18px;
        }

        .rp-3d-th:last-child {
          border-right: none;
        }

        .rp-3d-tbody {
          display: flex;
          flex-direction: column;
        }

        .rp-3d-tr {
          display: grid;
          grid-template-columns: 110px 1fr 1fr 1fr;
          border-bottom: 2px solid #fff;
        }

        .rp-3d-tr:last-child {
          border-bottom: none;
        }

        .rp-3d-td-time {
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 900;
          border-right: 2px solid #fff;
          background: #111;
          padding: 6px;
        }

        .rp-3d-td-mode {
          display: flex;
          align-items: stretch;
          justify-content: space-between;
          gap: 12px;
          padding: 8px 14px;
          border-right: 2px solid #fff;
          background: #111;
        }

        .rp-3d-td-mode:last-child {
          border-right: none;
        }

        .rp-3d-digit-box {
          flex: 1;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Arial Black', Arial, sans-serif;
          font-size: 54px;
          font-weight: 900;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.8);
          min-height: 72px;
        }

        @media (max-width: 768px) {
          .rp-3d-thead {
            grid-template-columns: 80px 1fr 1fr 1fr;
          }
          .rp-3d-tr {
            grid-template-columns: 80px 1fr 1fr 1fr;
          }
          .rp-3d-th {
            font-size: 20px;
            padding: 16px 4px;
          }
          .rp-3d-th:first-child {
            font-size: 14px;
          }
          .rp-3d-td-time {
            font-size: 16px;
            padding: 4px;
          }
          .rp-3d-td-mode {
            gap: 6px;
            padding: 5px 8px;
          }
          .rp-3d-digit-box {
            font-size: 38px;
            min-height: 52px;
            border-radius: 2px;
          }
        }
.rp-slot-card {
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid #5a5248;
  flex-shrink: 0;
}

.rp-slot-header {
  background: #0d5f95;
  color: #fff;
  text-align: center;
  padding: 8px 12px;
  font-size: 25px;
  font-weight: 800;
  border-bottom: 2px solid #0a4872;
  letter-spacing: 1px;
}

.rp-num-row {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 4px;
  padding: 4px;
  background: #1d1d1d;
  width: 100%;
}

.rp-num-cell {
  text-align: center;
  padding: 8px 2px;
  font-size: clamp(14px, 3.5vw, 45px);
  font-weight: 800;
  color: #fff;

  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.08);

  box-shadow:
    0 4px 10px rgba(0,0,0,0.28),
    inset 0 1px 1px rgba(255,255,255,0.12);

  transform: translateY(0) scale(1);

  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    filter 0.18s ease;

  position: relative;
  z-index: 1;
}

.rp-num-cell:hover {
  transform: translateY(-6px) scale(1.04);

  box-shadow:
    0 10px 20px rgba(0,0,0,0.35),
    inset 0 1px 1px rgba(0, 0, 0, 0.15);

  filter: brightness(1.08);

  z-index: 5;
}

.rp-num-cell:hover {
  transform: translateY(-4px);

  box-shadow:
    0 8px 18px rgba(253, 253, 253, 0.28),
    inset 0 1px 1px rgba(255,255,255,0.15);

  z-index: 5;
}
      `}</style>

      <div className="rp-root">
        <div className="rp-header">
          <button
            className="rp-back"
            onClick={() => navigate('/')}
          >
            {'<'} BACK
          </button>

          <div className="rp-title">
            {activeTab === '2D' ? '2D RESULTS' : '3D RESULTS'}
          </div>

          <div className="rp-header-spacer" />
        </div>

        <div className="rp-tabs">
          <button
            className={`rp-tab ${activeTab === '2D' ? 'active' : ''
              }`}
            onClick={() => setActiveTab('2D')}
          >
            2D GAME
          </button>

          <button
            className={`rp-tab ${activeTab === '3D' ? 'active' : ''
              }`}
            onClick={() => setActiveTab('3D')}
          >
            3D GAME
          </button>
        </div>

        <div className="rp-content">
          <div className="rp-date-nav">
            <button
              className="rp-nav-btn"
              onClick={() =>
                setSelectedDate((d) => shiftDate(d, -1))
              }
            >
              ‹
            </button>

            <input
              className="rp-date-input"
              type="date"
              value={selectedDate}
              max={todayISO()}
              onChange={(e) =>
                e.target.value &&
                setSelectedDate(e.target.value)
              }
            />

            <div className="rp-date-label">
              {displayDate(selectedDate)}
            </div>

            <button
              className="rp-nav-btn"
              disabled={!canGoNext}
              onClick={() =>
                setSelectedDate((d) => shiftDate(d, 1))
              }
            >
              ›
            </button>
          </div>

          <div className="rp-scroll">
            {activeTab === '2D' ? (
              loading ? (
                <div className="rp-empty">Loading results...</div>
              ) : draws.length === 0 ? (
                <div className="rp-empty">
                  No results found for
                  <br />
                  {displayDate(selectedDate)}
                </div>
              ) : (
                draws.map((draw) => {
                  const [row1, row2, row3] = getRows(draw.result_numbers);

                  return (
                    <div key={draw.id} className="rp-slot-card">
                      <div className="rp-slot-header">
                        {formatScheduledTime(draw.scheduled_at)}
                      </div>

                      {[row1, row2, row3].map((row, ri) => (
                        <div key={ri} className="rp-num-row">
                          {row.map((num, i) => (
                            <div
                              key={i}
                              className="rp-num-cell"
                              style={{
                                background: ROW_COLORS[ri],
                              }}
                            >
                              {num || '--'}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })
              )
            ) : loading3d ? (
              <div className="rp-empty">Loading results...</div>
            ) : draws3d.length === 0 ? (
              <div className="rp-empty">
                No 3D results found for
                <br />
                {displayDate(selectedDate)}
              </div>
            ) : (
              <div className="rp-3d-table">
                <div className="rp-3d-thead">
                  <div className="rp-3d-th" style={{ background: '#111' }}>DRAW</div>
                  <div className="rp-3d-th" style={{ background: '#bd0ebf' }}>A</div>
                  <div className="rp-3d-th" style={{ background: '#0830d9' }}>B</div>
                  <div className="rp-3d-th" style={{ background: '#17979b' }}>C</div>
                </div>
                <div className="rp-3d-tbody">
                  {draws3d.map((slot) => {
                    const timeStr = formatScheduledTime(slot.scheduled_at);
                    const [timePart, ampmPart] = timeStr.split(' ');

                    return (
                      <div key={slot.scheduled_at} className="rp-3d-tr">
                        <div className="rp-3d-td-time">
                          <div>{timePart}</div>
                          <div>{ampmPart}</div>
                        </div>
                        {(['A', 'B', 'C'] as const).map((mode) => {
                          const COLORS = {
                            A: '#bd0ebf',
                            B: '#0830d9',
                            C: '#17979b',
                          };

                          const num =
                            slot.results[mode] !== undefined
                              ? String(slot.results[mode]).padStart(3, '0')
                              : '---';

                          return (
                            <div key={mode} className="rp-3d-td-mode">
                              {num.split('').map((digit, idx) => (
                                <div
                                  key={idx}
                                  className="rp-3d-digit-box"
                                  style={{ background: COLORS[mode] }}
                                >
                                  {digit}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};