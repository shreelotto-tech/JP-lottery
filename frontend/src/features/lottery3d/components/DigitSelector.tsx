import React from 'react';

interface Props {
  selectedDigits: Set<number>;
  highlightedDigits: Set<number>;
  onToggleDigit: (d: number) => void;
  onToggleAll: () => void;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const DigitSelector: React.FC<Props> = ({
  selectedDigits,
  highlightedDigits,
  onToggleDigit,
  onToggleAll,
}) => {
  const allSelected = selectedDigits.size === 10;
  return (
    <>
      <button
        type="button"
        className={`t3-digit-btn all-btn${allSelected ? ' selected' : ''}`}
        onClick={onToggleAll}
      >
        All
      </button>
      {DIGITS.map((d) => {
        const cls = [
          't3-digit-btn',
          selectedDigits.has(d) ? 'selected' : '',
          highlightedDigits.has(d) ? 'highlighted' : '',
        ].filter(Boolean).join(' ');
        return (
          <button
            key={d}
            type="button"
            className={cls}
            onClick={() => onToggleDigit(d)}
          >
            {d}
          </button>
        );
      })}
    </>
  );
};

export default DigitSelector;
