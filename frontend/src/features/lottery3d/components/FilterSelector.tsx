import React from 'react';
import type { Filter3D } from '../types';

interface Props {
  selectedFilters: Set<Filter3D>;
  onToggle: (f: Filter3D) => void;
}

const FILTERS: { key: Filter3D; label: string }[] = [
  { key: 'single',    label: 'Single'     },
  { key: 'duplicate', label: 'Duplicates' },
  { key: 'triple',    label: 'Triples'    },
];

const FilterSelector: React.FC<Props> = ({ selectedFilters, onToggle }) => (
  <div className="t3-filter-group">
    {FILTERS.map(({ key, label }) => (
      <label key={key} className="t3-filter-label">
        <input
          type="checkbox"
          checked={selectedFilters.has(key)}
          onChange={() => onToggle(key)}
        />
        {label}
      </label>
    ))}
  </div>
);

export default FilterSelector;
