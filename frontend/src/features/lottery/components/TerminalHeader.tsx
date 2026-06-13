import React from 'react';
import type { DrawResult } from '../types';

interface TerminalHeaderProps {
  freePoints: number;
  lastDraw: DrawResult;
  getDrawBadgeStyle: (idx: number) => React.CSSProperties;
}

const TerminalHeader: React.FC<TerminalHeaderProps> = ({ freePoints, lastDraw, getDrawBadgeStyle }) => {
  return (
    <div className="lt-header">
      <div className="lt-logo">
        <div className="lt-logo-circle" style={{ overflow: 'hidden', padding: 0, border: 'none', background: 'transparent', height: '70px', width: '70px' }}>
          <img src="/logo.jpg" alt="Logo" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
        </div>
      </div>

      <div className="lt-lastdraw-info">
        <div className="lt-lastdraw-label">Last Draw</div>
        <div className="lt-lastdraw-date">{lastDraw.drawDate}</div>
        <div className="lt-lastdraw-date">{lastDraw.drawTime}</div>
        <div className="lt-lastdraw-date">FP: {freePoints.toFixed(2)}</div>
      </div>

      <div className="lt-lastdraw-grid">
        {lastDraw.numbers.map((num, idx) => (
          <div key={idx} className="lt-draw-badge" style={getDrawBadgeStyle(idx)}>
            {num}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TerminalHeader;
