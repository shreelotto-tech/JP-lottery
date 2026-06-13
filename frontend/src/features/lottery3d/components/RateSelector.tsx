import React from 'react';
import { RATES_3D } from '../constants';

interface Props {
  rate: number;
  onChange: (r: number) => void;
}

const RateSelector: React.FC<Props> = ({ rate, onChange }) => (
  <div className="t3-rate-group">
    <span style={{ color: '#555', fontWeight: 700 }}>Rate:</span>
    {RATES_3D.map((r) => (
      <label key={r} className="t3-rate-label">
        <input
          type="radio"
          name="t3-rate"
          value={r}
          checked={rate === r}
          onChange={() => onChange(r)}
        />
        {r}
      </label>
    ))}
  </div>
);

export default RateSelector;
