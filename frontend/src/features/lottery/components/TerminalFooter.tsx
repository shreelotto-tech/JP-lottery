import React from 'react';

interface TerminalFooterProps {
  totalQt: number;
  totalAmount: number;
  onFreeBuyNow: () => void;
}

const TerminalFooter: React.FC<TerminalFooterProps> = ({ totalQt, totalAmount, onFreeBuyNow }) => {
  return (
    <div className="lt-footer">
      <button
        className="lt-footer-btn"
        style={{ background: '#cc1144' }}
        onClick={() => {
          localStorage.removeItem('user');
          window.location.href = '/login';
        }}
      >
        Logout<br />(F8)
      </button>
      <button className="lt-footer-btn" style={{ background: '#1f1f1f' }}>
        Change<br />Password
      </button>
      <div className="lt-footer-mid">
        <div className="lt-footer-txn">
          <div style={{ fontWeight: 700 }}>Last Transaction:</div>
          <div>#1528956879, Pt(2)</div>
        </div>
        <input type="text" className="lt-barcode-input" placeholder="Barcode" />
      </div>
      <button className="lt-buynow" style={{ background: '#cc1199' }} onClick={onFreeBuyNow}>
        Free Buy Now (F6)
      </button>
      <div className="lt-footer-totals">
        <div className="lt-footer-total" style={{ background: '#228b22' }}>{totalQt}</div>
        <div className="lt-footer-total" style={{ background: '#228b22' }}>{totalAmount}</div>
      </div>
    </div>
  );
};

export default TerminalFooter;
