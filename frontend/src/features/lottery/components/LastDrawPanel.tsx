import React from 'react';
import type { DrawResult } from '../types';

interface LastDrawPanelProps {
  lastDraw: DrawResult;
}

const BADGE_COLORS = [
  ['#c62828', '#1565c0', '#00838f', '#2e7d32', '#6a1b9a', '#c62828', '#ef6c00', '#1565c0', '#00838f', '#ad1457'],
  ['#d32f2f', '#1976d2', '#00897b', '#388e3c', '#7b1fa2', '#d32f2f', '#f57c00', '#1976d2', '#00897b', '#c2185b'],
  ['#e53935', '#1e88e5', '#00acc1', '#43a047', '#8e24aa', '#e53935', '#fb8c00', '#1e88e5', '#00acc1', '#d81b60'],
];

const LastDrawPanel: React.FC<LastDrawPanelProps> = ({ lastDraw }) => {
  const rows = [
    lastDraw.numbers.slice(0, 10),
    lastDraw.numbers.slice(10, 20),
    lastDraw.numbers.slice(20, 30),
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        borderBottom: '2px solid #888',
        flexShrink: 0,
        background: '#2a1d2e',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      }}
    >
      {/* LAST DRAW INFO */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',

          padding: '12px 18px',

          background:
            'linear-gradient(180deg, #ff1744 0%, #b71c1c 100%)',

          color: '#fff',

          minWidth: '160px',

          flexShrink: 0,

          borderRight: '2px solid #880e0e',

          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.15)',
        }}
      >
        <div
          style={{
            fontSize: '18px',
            fontWeight: 800,
            letterSpacing: '0.5px',
            marginBottom: '6px',
          }}
        >
          Last Draw
        </div>

        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            opacity: 0.92,
            marginBottom: '2px',
          }}
        >
          {lastDraw.drawDate}
        </div>

        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            opacity: 0.92,
          }}
        >
          {lastDraw.drawTime}
        </div>
      </div>

      {/* NUMBER GRID */}
      <div
        style={{
          flex: 1,
          overflowX: 'auto',

          padding: '12px',

          background:
            'linear-gradient(180deg, #2b1d30 0%, #241827 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',

            gap: '12px',

            minWidth: 'max-content',
          }}
        >
          {rows.map((row, rowIdx) => (
            <div
              key={rowIdx}
              style={{
                display: 'flex',
                gap: '10px',
              }}
            >
              {row.map((num, colIdx) => (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform =
                      'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform =
                      'translateY(0)';
                  }}
                  style={{
                    background:
                      BADGE_COLORS[rowIdx][colIdx],

                    color: '#fff',

                    minWidth: '68px',
                    height: '52px',

                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',

                    borderRadius: '16px',

                    fontSize: '20px',
                    fontWeight: 800,

                    letterSpacing: '0.4px',

                    cursor: 'default',

                    border:
                      '1px solid rgba(255,255,255,0.08)',

                    boxShadow:
                      '0 4px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',

                    transition:
                      'transform 0.15s ease, box-shadow 0.15s ease',

                    userSelect: 'none',
                  }}
                >
                  {num}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LastDrawPanel;