import React from 'react';
import type { SeriesItem } from '../types';

interface SeriesSidebarProps {
  visibleSeries: SeriesItem[];
  checkedSeries: Set<string>;
  activeSeries: string;
  isAllChecked: boolean;
  isAllIndeterminate: boolean;
  onAllCheckbox: () => void;
  onSeriesCheckbox: (seriesId: string) => void;
  setActiveSeries: React.Dispatch<React.SetStateAction<string>>;
}

const SeriesSidebar: React.FC<SeriesSidebarProps> = ({
  visibleSeries,
  checkedSeries,
  activeSeries,
  isAllChecked,
  isAllIndeterminate,
  onAllCheckbox,
  onSeriesCheckbox,
  setActiveSeries,
}) => {
  const getRangeStyle = (seriesId: string): React.CSSProperties => {
    const groupPrefix = parseInt(seriesId.slice(0, 2), 10);

    if (groupPrefix >= 10 && groupPrefix <= 19) {
      return {
        background:
          'linear-gradient(180deg, #92006b 0%, #6d004d 100%)',
      };
    }

    if (groupPrefix >= 30 && groupPrefix <= 39) {
      return {
        background:
          'linear-gradient(180deg, #004d99 0%, #003366 100%)',
      };
    }

    if (groupPrefix >= 50 && groupPrefix <= 59) {
      return {
        background:
          'linear-gradient(180deg, #007744 0%, #00552f 100%)',
      };
    }

    return {
      background:
        'linear-gradient(180deg, #92006b 0%, #6d004d 100%)',
    };
  };

  const baseItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',

    height: '82px',

    margin: '0',

    padding: '0 14px',

    color: '#fff',

    cursor: 'pointer',

    userSelect: 'none',

    fontWeight: 700,

    boxSizing: 'border-box',

    width: '100%',
    borderRadius: '14px',
    borderTop: '6px solid transparent',
    borderBottom: '6px solid transparent',

    backgroundClip: 'padding-box',

    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.12), 0 3px 10px rgba(0,0,0,0.24)',

    transition:
      'transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease',
  };

  const checkboxStyle: React.CSSProperties = {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    flexShrink: 0,
    accentColor: 'black',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '25px',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      style={{
        width: '250px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        borderRight: '2px solid #a09890',
      }}
    >
      {/* Spacer aligned with grid header */}
      <div
        style={{
          height: '52px',
          background: '#c0b8b0',
          borderBottom: '2px solid #a09890',
        }}
      />

      {/* ALL BUTTON */}
      <div
        onClick={onAllCheckbox}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',

          height: '52px',

          padding: '0 14px',

          background:
            'linear-gradient(180deg, #ff2f2f 0%, #cf0000 100%)',

          color: '#fff',

          fontWeight: 800,

          borderBottom: '2px solid #a09890',

          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={isAllChecked}
          ref={(el) => {
            if (el) el.indeterminate = isAllIndeterminate;
          }}
          onChange={onAllCheckbox}
          onClick={(e) => e.stopPropagation()}
          style={checkboxStyle}
        />

        <span style={labelStyle}>All</span>
      </div>

      {/* SERIES */}
      {visibleSeries.map((s) => (
        <div
          key={s.id}
          role="button"
          tabIndex={0}
          onClick={() => {
            setActiveSeries(s.id);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveSeries(s.id);
            }
          }}
          style={{
            ...baseItemStyle,
            ...getRangeStyle(s.id),

            borderLeft:
              activeSeries === s.id
                ? '4px solid #ffd700'
                : '4px solid transparent',
              transform:
                activeSeries === s.id
                  ? 'scale(0.98)'
                  : 'scale(0.95)',

              filter:
                activeSeries === s.id
                  ? 'brightness(1.08)'
                  : 'brightness(1)',
          }}
        >
          <input
            type="checkbox"
            checked={checkedSeries.has(s.id)}
            onChange={(e) => {
              e.stopPropagation();
              onSeriesCheckbox(s.id);
              setActiveSeries(s.id);
            }}
            onClick={(e) => e.stopPropagation()}
            style={checkboxStyle}
          />

          <span style={labelStyle}>{s.label}</span>
        </div>
      ))}
    </div>
  );
};

export default SeriesSidebar;