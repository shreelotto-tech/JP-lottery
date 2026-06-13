import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { BetModifier, RangeGroup, SeriesItem } from '../types';

interface FilterBarProps {
  selectedRangeGroups: Set<string>;
  allSeries: SeriesItem[];
  rangeGroups: RangeGroup[];
  checkedSeries: Set<string>;
  betModifiers: BetModifier[];
  activeMods: Set<BetModifier>;
  isAllChecked: boolean;
  onTopFilter: (filterId: string) => void;
  setCheckedSeries: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSelectedRangeGroups: React.Dispatch<React.SetStateAction<Set<string>>>;
  setActiveSeries: React.Dispatch<React.SetStateAction<string>>;
  toggleMod: (mod: BetModifier) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  selectedRangeGroups,
  //allSeries,
  rangeGroups,
  //checkedSeries,
  betModifiers,
  activeMods,
  //isAllChecked,
  onTopFilter,
  //setCheckedSeries,
  //setSelectedRangeGroups,
  setActiveSeries,
  toggleMod,
}) => {
  const navigate = useNavigate();
  const isAllSelected = selectedRangeGroups.size === rangeGroups.length;
  const getRangeClass = (groupId: string): string => {
    if (groupId === '10-19') return 'lt-filter-btn-1019';
    if (groupId === '30-39') return 'lt-filter-btn-3039';
    if (groupId === '50-59') return 'lt-filter-btn-5059';
    return '';
  };

  return (
    <div className="lt-filterbar">
      <button
        type="button"
        className={`lt-filter-btn lt-filter-btn-all${isAllSelected ? ' active' : ''}`}
        onClick={() => onTopFilter('All')}
      >
        <input
          type="checkbox"
          className="lt-filter-chk"
          checked={isAllSelected}
          readOnly
        />
        All
      </button>

      {rangeGroups.map((group) => {
        const isSelected = selectedRangeGroups.has(group.id);
        return (
          <button
            type="button"
            key={group.id}
            className={`lt-filter-btn ${getRangeClass(group.id)}${isSelected ? ' active' : ''}`}
            onClick={() => onTopFilter(group.id)}
          >
            <input
              type="checkbox"
              className="lt-filter-chk"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onTopFilter(group.id);
                setActiveSeries(group.series[0].id);
              }}
              onClick={(e) => e.stopPropagation()}
            />
            {group.label}
          </button>
        );
      })}

      <button type="button" className="lt-filter-btn lt-filter-btn-3d active" onClick={() => navigate('/3d')}>3D GAME</button>

      <div className="lt-filter-sep" />

      {betModifiers.map((mod) => (
        <label key={mod} className={`lt-mod-check${activeMods.has(mod) ? ' active' : ''}`}>
          <input type="checkbox" checked={activeMods.has(mod)} onChange={() => toggleMod(mod)} />
          {mod}
        </label>
      ))}
    </div>
  );
};

export default FilterBar;
