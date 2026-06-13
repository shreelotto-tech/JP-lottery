import React from 'react';
import type { BetListEntry } from '../types';
import { getDisplayNumber, completePairNumber } from '../utils';

interface Props {
  betList: BetListEntry[];
  onRemove: (id: string) => void;
}

const BetList: React.FC<Props> = ({ betList, onRemove }) => {
  if (betList.length === 0) {
    return (
      <div className="t3-betlist-area">
        <div className="t3-betlist-empty">No numbers selected. Use Motor, Lucky Pick, or Add Number.</div>
      </div>
    );
  }

  return (
    <div className="t3-betlist-area">
      {betList.map((entry) => {
        const effectiveNum = entry.pairDigits
          ? completePairNumber(entry.pairDigits, entry.betType)
          : entry.number;
        return (
          <div key={entry.id} className="t3-bet-card">
            <span className="t3-bc-number">
              <span style={{ color: '#666', marginRight: '4px' }}>{entry.mode}-</span>
              {getDisplayNumber(effectiveNum, entry.betType)}
            </span>
            <span className="t3-bc-type">{entry.betType}</span>
            <span className="t3-bc-amount">{entry.amount}</span>
            <button
              type="button"
              className="t3-bc-remove"
              onClick={() => onRemove(entry.id)}
              aria-label="Remove"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default BetList;
