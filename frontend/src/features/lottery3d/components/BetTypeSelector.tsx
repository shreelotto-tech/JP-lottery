import React from 'react';
import type { BetType3D } from '../types';
import { BET_TYPES_3D } from '../constants';

interface Props {
  activeBetTypes: Set<BetType3D>;
  onToggle: (t: BetType3D) => void;
  onToggleAll: () => void;
  isMotorMode?: boolean;
}

const BetTypeSelector: React.FC<Props> = ({ activeBetTypes, onToggle, onToggleAll, isMotorMode }) => {
  const allActive = activeBetTypes.size === BET_TYPES_3D.length;
  return (
    <div className="t3-bettypebar">
      <label className={`t3-bettype-label${allActive ? ' active' : ''}${isMotorMode ? ' disabled' : ''}`}>
        <input type="checkbox" checked={allActive} onChange={onToggleAll} disabled={isMotorMode} />
        All
      </label>
      {BET_TYPES_3D.map((t) => {
        const isDisabled = isMotorMode && t !== 'STR';
        return (
          <label key={t} className={`t3-bettype-label${activeBetTypes.has(t) ? ' active' : ''}${isDisabled ? ' disabled' : ''}`}>
            <input type="checkbox" checked={activeBetTypes.has(t)} onChange={() => onToggle(t)} disabled={isDisabled} />
            {t}
          </label>
        );
      })}
    </div>
  );
};

export default BetTypeSelector;
