import React from 'react';
import type { Mode3D } from '../types';
import { MODES_3D } from '../constants';

interface Props {
  selectedModes: Set<Mode3D>;
  onToggleMode: (m: Mode3D) => void;
  onToggleAll: () => void;
}

const ModeSelector: React.FC<Props> = ({ selectedModes, onToggleMode, onToggleAll }) => {
  const allSelected = selectedModes.size === MODES_3D.length;
  return (
    <div className="t3-mode-group">
      <button
        type="button"
        className={`t3-mode-btn${allSelected ? ' active-ALL' : ''}`}
        onClick={onToggleAll}
      >
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onToggleAll}
          onClick={(e) => e.stopPropagation()}
        />
        ALL
      </button>
      {MODES_3D.map((m) => (
        <button
          key={m}
          type="button"
          className={`t3-mode-btn${selectedModes.has(m) ? ` active-${m}` : ''}`}
          onClick={() => onToggleMode(m)}
        >
          <input
            type="checkbox"
            checked={selectedModes.has(m)}
            onChange={() => onToggleMode(m)}
            onClick={(e) => e.stopPropagation()}
          />
          {m}
        </button>
      ))}
    </div>
  );
};

export default ModeSelector;
