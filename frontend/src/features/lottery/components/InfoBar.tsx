import React from 'react';
import type { Profile } from '../../../lib/AuthContext';

interface InfoBarProps {
  today: string;
  currentTime: string;
  countdownStr: string;
  balance: number;
  freePoints: number;
  slotLabel?: string;
  slotsOver?: boolean;
  nextSlotText?: string;
  onLogout?: () => void;
  userProfile?: Profile | null;
}

const InfoBar: React.FC<InfoBarProps> = ({ today, currentTime, countdownStr, balance: _balance, freePoints, slotLabel, slotsOver, nextSlotText, onLogout, userProfile }) => {
  return (
    <div className="lt-infobar">
      <div className="lt-infobar-seg lt-infobar-seg--today">
        <span className="lt-infobar-key">TODAY:</span>
        <span className="lt-infobar-val">{today}</span>
      </div>
      <div className="lt-infobar-seg lt-infobar-seg--time">
        <span className="lt-infobar-key">CURRENT:</span>
        <span className="lt-infobar-val">{currentTime}</span>
      </div>
      <div className="lt-infobar-seg lt-infobar-seg--slot">
        <span className="lt-infobar-key">SLOT:</span>
        <span className="lt-infobar-val" style={slotsOver ? { color: '#ffffff' } : undefined}>
          {slotsOver ? 'ALL SLOTS OVER' : (slotLabel ?? '03:15:00 PM')}
        </span>
      </div>
      <div className="lt-infobar-seg lt-infobar-seg--remain">
        <span className="lt-infobar-key">{slotsOver ? 'NEXT:' : 'REMAIN:'}</span>
        <span className="lt-infobar-val lt-infobar-val--remain">
          {slotsOver ? (nextSlotText ?? '08:45 AM') : countdownStr}
        </span>
      </div>
      {userProfile && (
        <div className="lt-infobar-seg" style={{ flex: '0 0 auto', background: '#cc1111', padding: '0 8px' }}>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 800, letterSpacing: 0.5 }}>
            {userProfile.display_name || userProfile.username} ({userProfile.username})
          </span>
        </div>
      )}
      <div className="lt-infobar-seg lt-infobar-seg--balance">
        <span className="lt-infobar-freepoints">FREE POINTS: {freePoints.toFixed(2)}</span>
      </div>
      {onLogout && (
        <div className="lt-infobar-seg" style={{ flex: '0 0 auto' }}>
          <button
            onClick={onLogout}
            style={{
              background: '#cc1111',
              border: '2px solid #9e0d0d',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: '3px',
              fontSize: '9px',
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.5px',
            }}
          >
            LOGOUT
          </button>
        </div>
      )}
    </div>
  );
};

export default InfoBar;