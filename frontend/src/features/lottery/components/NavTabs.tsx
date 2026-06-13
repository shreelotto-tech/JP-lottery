import React from 'react';
import type { ActiveTab } from '../types';

interface NavTabsProps {
  tabs: { label: ActiveTab; bg: string }[];
  activeTab: ActiveTab;
  onTabClick: (tab: ActiveTab) => void;
  labelOverrides?: Partial<Record<string, { text: string; bg?: string }>>;
}

const TAB_STYLES: Record<string, React.CSSProperties> = {
  RESULT: {
    background: 'linear-gradient(180deg, #e53935, #b71c1c)',
    color: '#fff',
    fontWeight: 800,
  },
  'ADVANCE-DRAW': {
    background: 'linear-gradient(180deg, #43a047, #2e7d32)',
    color: '#fff',
    fontWeight: 800,
  },
  HISTORY: {
    background: 'linear-gradient(180deg, #7b1fa2, #4a148c)',
    color: '#fff',
    fontWeight: 800,
  },
  REFRESH: {
    background: 'linear-gradient(180deg, #546e7a, #37474f)',
    color: '#fff',
    fontWeight: 800,
  },
  CANCEL: {
    background: 'linear-gradient(180deg, #c62828, #8b0000)',
    color: '#fff',
    fontWeight: 800,
  },
};

const NavTabs: React.FC<NavTabsProps> = ({ tabs, activeTab, onTabClick, labelOverrides }) => {
  return (
    <div style={{ display: 'flex', flexShrink: 0, borderBottom: '2px solid #888' }}>
      {tabs.map((tab, idx) => {
        const override = labelOverrides?.[tab.label];
        const baseStyle = TAB_STYLES[tab.label] || { background: '#546e7a', color: '#fff' };
        const style = override?.bg ? { ...baseStyle, background: override.bg } : baseStyle;
        const displayText = override?.text ?? tab.label;
        const isActive = activeTab === tab.label;
        return (
          <button
            key={tab.label}
            style={{
              ...style,
              flex: 1,
              padding: '8px 4px',
              border: 'none',
              borderRight: idx < tabs.length - 1 ? '1px solid rgba(0,0,0,0.3)' : 'none',
              fontSize: '17px',
              letterSpacing: '0.5px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textTransform: 'uppercase',
              boxShadow: isActive ? 'inset 0 -3px 0 rgba(255,255,255,0.5)' : 'none',
              filter: isActive ? 'brightness(1.15)' : 'none',
              transition: 'filter 0.15s',
            }}
            onClick={() => onTabClick(tab.label)}
            onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.filter = isActive ? 'brightness(1.15)' : 'none')}
          >
            {displayText}
          </button>
        );
      })}
    </div>
  );
};

export default NavTabs;
