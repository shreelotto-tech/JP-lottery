import React from 'react';

const Terminal3DStyles: React.FC = () => (
  <style>{`
    /* ── Root ─────────────────────────────────────────────── */
    .t3-root {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
      height: auto;
      min-width: 1280px;
      overflow-x: auto;
      overflow-y: auto;
      background: #f0f0f0;
      font-family: 'Arial Black', 'Impact', sans-serif;
      font-size: 15px;
      color: #333;
      user-select: none;
    }

    /* ── Brand Banner (New) ──────────────────────────────── */
    .t3-brand-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 20px;
      background: linear-gradient(180deg, #e0e0e0 0%, #b0b0b0 50%, #e0e0e0 100%);
      border-bottom: 3px solid #888;
      min-height: 80px;
      flex-shrink: 0;
      flex-wrap: wrap;
      gap: 10px;
    }
    .t3-brand-left {
      display: flex;
      font-size: 50px;
      font-weight: 900;
      letter-spacing: -2px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    }
    .t3-brand-left .digit-1 { color: #55cc33; }
    .t3-brand-left .digit-2 { color: #3366cc; }
    .t3-brand-left .digit-3 { color: #cc3333; }
    
    .t3-brand-title {
      font-size: 56px;
      font-weight: 900;
      color: #ff0000;
      background: -webkit-linear-gradient(#ff6666, #cc0000);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(3px 3px 2px rgba(0,0,0,0.6));
      letter-spacing: 2px;
      font-family: 'Impact', sans-serif;
    }

    .t3-brand-right {
      display: flex;
      font-size: 40px;
      font-weight: 900;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    }
    .t3-brand-right .digit-0 { color: #ffcc00; }
    .t3-brand-right .digit-1 { color: #cc3333; }
    .t3-brand-right .digit-2 { color: #3366cc; }

    /* ── Last Draw Header ────────────────────────────────── */
    .t3-last-draw-header {
      display: flex;
      align-items: stretch;
      background: #222;
      border-bottom: 2px solid #555;
      flex-shrink: 0;
    }
    .t3-last-draw-box {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 8px 12px;
      background: #ff5500;
      color: #fff;
      font-weight: 900;
      width: 140px;
      text-align: center;
      border-right: 2px solid #000;
    }
    .t3-last-draw-label { font-size: 14px; margin-bottom: 4px; }
    .t3-last-draw-time  { font-size: 18px; color: #fff; text-shadow: 1px 1px 2px #000; }

    .t3-last-draw-results {
      flex: 1;
      display: flex;
    }
    .t3-ldr-block {
      flex: 1;
      display: flex;
      flex-direction: column;
      border-right: 2px solid #000;
    }
    .t3-ldr-block:last-child { border-right: none; }
    
    .t3-ldr-title {
      text-align: center;
      font-size: 20px;
      font-weight: 900;
      color: #fff;
      padding: 6px 0;
      text-shadow: 1px 1px 2px #000;
    }
    
    .t3-ldr-numbers {
      display: flex;
      gap: 12px; /* Increased gap slightly for larger boxes */
      padding: 10px; /* Gives a little breathing room inside the colored block */
      justify-content: center; 
    }
    
    /* Make the boxes massive and perfectly centered */
    .t3-last-draw-results .t3-ldr-numbers .ldr-box {
      background-color: #ffffff !important;
      color: #000000 !important;
      width: 70px;
      height: 90px;
      display: flex; 
      align-items: center;
      justify-content: center;
      font-size: 58px;
      border-radius: 6px; 
      font-weight: 900;
      box-shadow: 2px 2px 6px rgba(0,0,0,0.3);
    }
    
    .t3-ldr-A { background: linear-gradient(180deg, #4b0082 0%, #2b004a 100%); }
    .t3-ldr-B { background: linear-gradient(180deg, #008000 0%, #004d00 100%); }
    .t3-ldr-C { background: linear-gradient(180deg, #ff1493 0%, #b30059 100%); }

    /* ── Info bar ─────────────────────────────────────────── */
    .t3-infobar {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      background: #000;
      color: #fff;
      font-size: 14px;
      font-weight: 900;
      border-bottom: 2px solid #fff;
      flex-shrink: 0;
    }
    .t3-infobar-cell {
      padding: 6px 12px;
      border-right: 1px solid #444;
      white-space: nowrap;
      text-align: center;
    }
    .t3-infobar-cell:last-child { border-right: none; }
    .t3-infobar-cell .t3-ib-label { color: #ddd; margin-right: 6px; }
    .t3-infobar-cell .t3-ib-value { color: #ffff00; }
    .t3-infobar-cell .t3-ib-value.red { color: #ff4444; }

    /* ── User / Nav bar ───────────────────────────────────── */
    .t3-userbar {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #ffffcc;
      border-bottom: 2px solid #ccc;
      padding: 6px 10px;
      flex-wrap: wrap;
      flex-shrink: 0;
    }
    .t3-user-pts {
      flex: 1;
      font-size: 16px;
      font-weight: 900;
      color: #cc0000;
      font-family: Arial, sans-serif;
    }
    .t3-nav-btn {
      padding: 12px 35px;
      font-family: inherit;
      font-size: 16px;
      font-weight: 900;
      border: 1px solid rgba(0,0,0,0.2);
      border-radius: 2px;
      cursor: pointer;
      color: #fff;
      text-transform: uppercase;
      box-shadow: inset 0 2px 5px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.3);
      text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
    }
    .t3-nav-btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
    .t3-nav-btn:active { transform: translateY(1px); box-shadow: inset 0 2px 5px rgba(0,0,0,0.3); }

    /* ── Control bar (modes + game type switcher) ────────── */
    .t3-controlbar {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #ffd1dc; /* light pinkish */
      border-bottom: 2px solid #fff;
      padding: 6px 10px;
      flex-wrap: wrap;
      flex-shrink: 0;
    }
    
    .t3-mode-group { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .t3-mode-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      height: 50px;
      padding: 0 20px;
      min-width: 200px;
      border: 2px solid #000;
      border-radius: 6px;
      background: #888;
      color: #fff;
      font-family: inherit;
      font-size: 20px;
      font-weight: 900;
      cursor: pointer;
      line-height: 1;
      box-shadow: 2px 2px 0px rgba(0,0,0,0.2);
    }
    .t3-mode-btn input[type="checkbox"] { width: 22px; height: 22px; cursor: pointer; margin: 0; }
    
    .t3-mode-btn.active-A  { background: #4caf50; border-color: #1b5e20; }
    .t3-mode-btn.active-B  { background: #ff9800; border-color: #e65100; }
    .t3-mode-btn.active-C  { background: #f44336; border-color: #b71c1c; }
    .t3-mode-btn.active-ALL{ background: #795548; border-color: #3e2723; }

    .t3-gametype-group { display: flex; gap: 8px; margin-left: auto; flex-wrap: wrap; }
    .t3-gametype-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 50px;
      padding: 0 20px;
      min-width: 200px;
      border: 2px solid #000;
      border-radius: 6px;
      font-family: inherit;
      font-size: 20px;
      font-weight: 900;
      cursor: pointer;
      color: #fff;
      background: #1a237e; /* dark blue */
      box-shadow: 2px 2px 0px rgba(0,0,0,0.2);
    }
    .t3-gametype-btn:hover { filter: brightness(1.2); }
    .t3-gametype-btn.active { background: #311b92; border-color: #fff; }

    /* ── Digit selector row ──────────────────────────────── */
    .t3-digitbar {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #ffb6c1; /* pink */
      border-bottom: 2px solid #fff;
      padding: 8px 10px;
      flex-wrap: wrap;
      flex-shrink: 0;
    }
    .t3-digit-btn {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      border: 2px solid #777;
      background: #fff;
      color: #555;
      font-family: inherit;
      font-size: 16px;
      font-weight: 900;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: inset 1px 1px 3px rgba(0,0,0,0.1);
    }
    .t3-digit-btn.selected { background: #f44336; border-color: #b71c1c; color: #fff; }
    .t3-digit-btn.highlighted {
      background: #ffeb3b;
      border-color: #fbc02d;
      color: #000;
    }
    .t3-digit-btn.selected.highlighted {
      background: #ff9800;
      border-color: #e65100;
      color: #fff;
    }
    .t3-digit-btn.all-btn  { width: 48px; border-radius: 20px; font-size: 14px; border: 2px solid #e91e63; color: #e91e63; }
    .t3-digit-btn.all-btn.selected { background: #e91e63; color: #fff; }
    .t3-digit-btn:hover { filter: brightness(0.95); }

    .t3-filter-group {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      flex: 1;
      margin-left: 12px;
      flex-wrap: wrap;
    }
    .t3-filter-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 900;
      color: #333;
      cursor: pointer;
    }
    .t3-filter-label input { width: 16px; height: 16px; cursor: pointer; }

    .t3-action-group {
      display: flex;
      gap: 8px;
      margin-left: auto;
      flex-wrap: wrap;
      align-items: center;
    }
    .t3-motor-btn {
      padding: 6px 18px;
      background: #ff5722;
      border: 2px solid #bf360c;
      border-radius: 4px;
      color: #fff;
      font-family: inherit;
      font-size: 14px;
      font-weight: 900;
      cursor: pointer;
      box-shadow: 2px 2px 0px rgba(0,0,0,0.2);
    }
    .t3-motor-btn:hover { filter: brightness(1.1); }
    .t3-motor-btn.frozen { background: #888; border-color: #444; }
    
    .t3-qty-group {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      font-weight: 900;
      color: #333;
      flex-wrap: wrap;
    }
    .t3-qty-input {
      width: 60px;
      padding: 6px;
      border: 2px solid #555;
      border-radius: 4px;
      background: #fff;
      color: #000;
      font-family: inherit;
      font-size: 14px;
      font-weight: 900;
      text-align: center;
    }
    .t3-lucky-btn {
      padding: 6px 16px;
      background: #004d40;
      border: 2px solid #00251a;
      border-radius: 4px;
      color: #fff;
      font-family: inherit;
      font-size: 14px;
      font-weight: 900;
      cursor: pointer;
      box-shadow: 2px 2px 0px rgba(0,0,0,0.2);
    }
    .t3-lucky-btn:hover { filter: brightness(1.2); }

    /* ── Bet type row ─────────────────────────────────────── */
    .t3-bettypebar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 18px;
      background: #fff0f5; /* lighter pink */
      border-bottom: 2px solid #ccc;
      padding: 16px 14px;
      flex-wrap: wrap;
      flex-shrink: 0;
    }
    .t3-bettype-label {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 12px 32px;
      font-size: 20px;
      font-weight: 900;
      color: #333;
      cursor: pointer;
      border: 2px solid #bdbdbd;
      border-radius: 6px;
      background: #fff;
    }
    .t3-bettype-label input { width: 24px; height: 24px; cursor: pointer; }
    .t3-bettype-label.active { color: #d81b60; border-color: #d81b60; background: #ffe4ef; }
    .t3-bettype-label.disabled { opacity: 0.4; cursor: not-allowed; }
    .t3-bettype-label.disabled input { cursor: not-allowed; }
    .t3-last-trans {
      margin-left: auto;
      font-size: 13px;
      font-weight: 700;
      color: #666;
    }
    .t3-last-trans span { color: #2e7d32; }

    /* ── Add number / range / rate row ───────────────────── */
    .t3-inputbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: #e1bee7; /* light purple/pink */
      border-bottom: 2px solid #ba68c8;
      padding: 10px 12px;
      flex-wrap: wrap;
      flex-shrink: 0;
    }
    .t3-add-number-input {
      padding: 8px 24px;
      background: #fff;
      border: 2px solid #8e24aa;
      border-radius: 20px;
      font-family: inherit;
      font-size: 15px;
      font-weight: 900;
      color: #333;
      text-align: center;
      width: 320px;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
    }
    .t3-add-number-input::placeholder { color: #888; }
    .t3-add-number-input:focus { outline: none; border-color: #4a148c; }
    .t3-add-number-input:disabled { opacity: 0.6; cursor: not-allowed; }
    
    .t3-range-group {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 900;
      color: #333;
      flex-wrap: wrap;
    }
    .t3-range-input {
      width: 76px;
      padding: 6px;
      border: 2px solid #8e24aa;
      border-radius: 12px;
      font-family: inherit;
      font-size: 14px;
      font-weight: 900;
      text-align: center;
      background: #fff;
    }
    .t3-range-input:focus { outline: none; border-color: #4a148c; }
    .t3-manual-add-btn {
      padding: 6px 16px;
      background: linear-gradient(135deg, #8e24aa, #6a1b9a);
      color: #fff;
      border: none;
      border-radius: 12px;
      font-family: inherit;
      font-size: 14px;
      font-weight: 900;
      cursor: pointer;
      box-shadow: 0 3px 0 #4a148c, 0 4px 8px rgba(0,0,0,0.25);
      transition: transform 0.08s, box-shadow 0.08s;
      letter-spacing: 0.5px;
    }
    .t3-manual-add-btn:hover {
      background: linear-gradient(135deg, #ab47bc, #8e24aa);
      box-shadow: 0 4px 0 #4a148c, 0 6px 12px rgba(0,0,0,0.3);
    }
    .t3-manual-add-btn:active {
      transform: translateY(2px);
      box-shadow: 0 1px 0 #4a148c, 0 2px 4px rgba(0,0,0,0.2);
    }
    .t3-manual-add-btn:disabled,
    .t3-range-input:disabled { opacity: 0.6; cursor: not-allowed; }
    
    .t3-rate-group {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 23px;
      font-weight: 1200;
      color: #333;
      flex-wrap: wrap;
    }
    .t3-rate-label {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      font-size: 23px;
      font-weight: 1200;
    }

    /* ── Bet list area ────────────────────────────────────── */
    .t3-main-scroll {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .t3-betlist-area {
      min-height: 250px;
      background: #fff;
      padding: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-content: flex-start;
      border: 4px solid #81d4fa; /* light blue border inside */
      margin: 8px;
      margin-bottom: 0;
    }
    .t3-bet-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: #f1f8e9;
      border: 2px solid #8bc34a;
      border-radius: 4px;
      padding: 6px 12px;
      min-width: 72px;
      position: relative;
    }
    .t3-bet-card .t3-bc-number {
      font-size: 18px;
      font-weight: 900;
      color: #000;
      letter-spacing: 1px;
    }
    .t3-bet-card .t3-bc-type {
      font-size: 12px;
      color: #1b5e20;
      font-weight: 900;
    }
    .t3-bet-card .t3-bc-amount {
      font-size: 13px;
      color: #333;
      font-weight: bold;
    }
    .t3-bet-card .t3-bc-remove {
      color: #d32f2f;
      font-weight: 900;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      border: none;
      background: none;
      padding: 0;
    }
    .t3-betlist-empty {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #aaa;
      font-size: 14px;
      font-style: italic;
      font-weight: normal;
    }

    /* ── Footer ──────────────────────────────────────────── */
    .t3-footer {
      display: flex;
      align-items: center;
      gap: 16px;
      background: #e0e0e0;
      border-top: 2px solid #9e9e9e;
      padding: 8px 12px;
      flex-wrap: wrap;
    }
    .t3-footer-barcode {
      padding: 10px 16px;
      border: 2px solid #757575;
      background: #fff;
      color: #000;
      font-family: inherit;
      font-size: 16px;
      font-weight: bold;
      border-radius: 4px;
      flex: 1;
      min-width: 160px;
      max-width: 300px;
    }
    .t3-footer-btn {
      padding: 12px 28px;
      border: 2px solid #000;
      border-radius: 4px;
      font-family: inherit;
      font-size: 18px;
      min-width: 150px;
      font-weight: 900;
      cursor: pointer;
      color: #fff;
      box-shadow: 2px 2px 0px rgba(0,0,0,0.3);
    }
    .t3-footer-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
    .t3-footer-btn.howto    { background: #388e3c; }
    .t3-footer-btn.logout   { background: #e53935; }
    .t3-footer-btn.cpwd     { background: #f57c00; }
    .t3-footer-btn.buy      { background: #6a1b9a; flex: 1; max-width: 150px; font-size: 18px; }
    .t3-footer-btn.freebuy  { background: #0277bd; flex: 1; max-width: 160px; font-size: 16px; }
    .t3-footer-total {
      padding: 8px 24px;
      background: #fff;
      border: 2px solid #000;
      color: #000;
      font-size: 22px;
      font-weight: 900;
      border-radius: 4px;
      min-width: 100px;
      text-align: center;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
    }

    /* ── How To Play modal ─────────────────────────────── */
    .t3-howto-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }
    .t3-howto-modal {
      position: relative;
      background: #fff;
      width: min(1100px, 92vw);
      max-height: 90vh;
      border-radius: 8px;
      box-shadow: 0 12px 32px rgba(0,0,0,0.35);
      padding: 18px 16px 20px;
      overflow: auto;
      font-family: Arial, sans-serif;
      color: #111;
    }
    .t3-howto-title {
      font-size: 22px;
      font-weight: 900;
      margin-bottom: 10px;
    }
    .t3-howto-close {
      position: absolute;
      top: 10px;
      right: 12px;
      background: none;
      border: none;
      font-size: 22px;
      font-weight: 900;
      cursor: pointer;
      line-height: 1;
    }
    .t3-howto-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    .t3-howto-table th,
    .t3-howto-table td {
      border: 1px solid #333;
      padding: 8px 10px;
      text-align: center;
      vertical-align: middle;
    }
    .t3-howto-table thead th {
      background: #f26522;
      color: #fff;
      font-weight: 900;
    }
    .t3-howto-draw {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .t3-howto-draw-group + .t3-howto-draw-group {
      margin-top: 8px;
    }
    .t3-dot {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #3b2cc5;
      color: #fff;
      font-weight: 900;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
    }
    .t3-howto-draw .t3-dot:nth-child(3n) {
      margin-right: 10px;
    }
    .t3-howto-note {
      font-size: 13px;
      font-weight: 700;
      margin-left: 6px;
      white-space: nowrap;
    }

    /* ── Mobile responsive ──────────────────────────────── */
    @media (max-width: 1px) {
      .t3-root { height: auto; min-height: 100dvh; overflow-y: auto; overflow-x: hidden; }
      
      /* Brand Banner */
      .t3-brand-banner {
        height: auto;
        padding: 8px 10px;
        flex-wrap: nowrap;
        overflow-x: auto;
        justify-content: flex-start;
      }
      .t3-brand-left, .t3-brand-right { font-size: 24px; flex-shrink: 0; }
      .t3-brand-title { font-size: 30px; flex-shrink: 0; padding: 0 16px; }
      
      /* Last Draw */
      .t3-last-draw-header { flex-wrap: nowrap; overflow-x: auto; }
      .t3-last-draw-box { flex-shrink: 0; min-width: 120px; }
      .t3-last-draw-results { flex-shrink: 0; min-width: 320px; }

      /* Info Bar */
      .t3-infobar { display: flex; flex-wrap: nowrap; overflow-x: auto; }
      .t3-infobar-cell { flex-shrink: 0; }

      /* Toolbars - Horizontally scrollable to keep desktop layout neat */
      .t3-userbar,
      .t3-controlbar,
      .t3-digitbar,
      .t3-bettypebar,
      .t3-inputbar,
      .t3-footer {
        flex-wrap: nowrap;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        justify-content: flex-start;
      }
      
      /* Hide scrollbars for cleaner look */
      .t3-userbar::-webkit-scrollbar,
      .t3-controlbar::-webkit-scrollbar,
      .t3-digitbar::-webkit-scrollbar,
      .t3-bettypebar::-webkit-scrollbar,
      .t3-inputbar::-webkit-scrollbar,
      .t3-footer::-webkit-scrollbar,
      .t3-infobar::-webkit-scrollbar,
      .t3-last-draw-header::-webkit-scrollbar,
      .t3-brand-banner::-webkit-scrollbar {
        display: none;
      }

      /* Prevent items from shrinking, keeping boxes LARGE and uniform */
      .t3-mode-group, .t3-gametype-group, .t3-mode-btn, .t3-gametype-btn,
      .t3-digit-btn, .t3-filter-group, .t3-action-group, .t3-motor-btn, .t3-lucky-btn,
      .t3-qty-group, .t3-bettype-label, .t3-add-number-input, .t3-range-group,
      .t3-rate-group, .t3-rate-label, .t3-footer-btn, .t3-footer-total, .t3-footer-barcode {
        flex-shrink: 0;
        white-space: nowrap;
      }
      
      .t3-mode-group, .t3-gametype-group, .t3-filter-group, .t3-action-group,
      .t3-range-group, .t3-rate-group {
        flex-wrap: nowrap;
      }
      
      .t3-filter-group { margin-left: 16px; }
      .t3-action-group { margin-left: 16px; }
      .t3-rate-group { margin-left: 16px; }
      
      /* Adjust padding and sizing slightly for mobile touch */
      .t3-mode-btn { padding: 10px 16px; min-width: 90px; }
      .t3-gametype-btn { padding: 10px 16px; min-width: 80px; }
      .t3-digit-btn { width: 44px; height: 44px; font-size: 18px; } /* Larger touch targets */
      .t3-digit-btn.all-btn { width: 56px; }
      .t3-motor-btn, .t3-lucky-btn { padding: 8px 16px; }
      .t3-add-number-input { width: 150px; }
      .t3-range-input { width: 80px; }
      
      .t3-main-scroll { flex: 1; overflow-y: auto; }
      .t3-betlist-area { min-height: 200px; height: auto; margin-bottom: 8px; }
    }

    /* ── Small phones (≤480px) — scale down fonts & spacing ── */
    @media (max-width: 1px) {
      .t3-brand-left, .t3-brand-right { font-size: 18px; }
      .t3-brand-title { font-size: 22px; padding: 0 10px; }
      .t3-last-draw-box { min-width: 90px; padding: 6px 8px; }
      .t3-last-draw-label { font-size: 11px; }
      .t3-last-draw-time  { font-size: 14px; }
      .ldr-box { font-size: 20px; }
      .t3-ldr-title { font-size: 14px; }
      .t3-infobar { font-size: 11px; }
      .t3-infobar-cell { padding: 4px 8px; }
      .t3-mode-btn { font-size: 13px; padding: 8px 10px; min-width: 70px; }
      .t3-gametype-btn { font-size: 12px; padding: 8px 10px; min-width: 70px; }
      .t3-digit-btn { width: 36px; height: 36px; font-size: 14px; }
      .t3-nav-btn { padding: 6px 10px; font-size: 11px; }
      .t3-user-pts { font-size: 13px; }
      .t3-footer-btn { padding: 8px 12px; font-size: 12px; }
      .t3-footer-total { font-size: 16px; padding: 6px 14px; min-width: 70px; }
    }

    /* ── Narrow phones (≤600px) — wrap everything, no horizontal scroll ── */
    @media (max-width: 1px) {
      html, body, #root {
        overflow-x: hidden;
        overflow-y: auto;
        height: auto;
        min-height: 100%;
      }
      .t3-root {
        height: auto;
        min-height: 100dvh;
        overflow-x: hidden;
        overflow-y: auto;
        width: 100%;
      }

      /* Brand Banner - wrap */
      .t3-brand-banner {
        min-height: auto;
        flex-wrap: wrap;
        overflow-x: hidden;
        justify-content: center;
        gap: 4px;
        padding: 6px 8px;
      }
      .t3-brand-left, .t3-brand-right { font-size: 16px; }
      .t3-brand-title { font-size: 20px; padding: 0 8px; }

      /* Last Draw - wrap */
      .t3-last-draw-header { flex-wrap: wrap; overflow-x: hidden; }
      .t3-last-draw-box { width: auto; min-width: 0 !important; flex: 0 0 100%; }
      .t3-last-draw-results { min-width: 0 !important; flex: 1 1 100%; }

      /* Info Bar - wrap */
      .t3-infobar {
        display: flex;
        flex-wrap: wrap;
        overflow-x: hidden;
        font-size: 10px;
      }
      .t3-infobar-cell {
        flex: 1 1 45%;
        min-width: 0 !important;
        padding: 3px 6px;
        text-align: left;
      }

      /* ALL toolbars — WRAP instead of scroll */
      .t3-userbar,
      .t3-controlbar,
      .t3-digitbar,
      .t3-bettypebar,
      .t3-inputbar,
      .t3-footer {
        flex-wrap: wrap !important;
        overflow-x: hidden !important;
        justify-content: flex-start;
        gap: 4px;
      }

      /* Allow items to shrink and wrap */
      .t3-mode-group, .t3-gametype-group, .t3-filter-group, .t3-action-group,
      .t3-range-group, .t3-rate-group, .t3-qty-group {
        flex-wrap: wrap !important;
        flex-shrink: 1;
      }
      .t3-mode-btn, .t3-gametype-btn, .t3-nav-btn,
      .t3-footer-btn, .t3-footer-total, .t3-footer-barcode,
      .t3-motor-btn, .t3-lucky-btn, .t3-bettype-label {
        flex-shrink: 1;
        white-space: nowrap;
      }

      /* Userbar: user info + nav buttons wrap */
      .t3-userbar { padding: 6px 8px; gap: 4px; }
      .t3-user-pts { flex: 1 1 100%; font-size: 11px; margin-bottom: 2px; }
      .t3-nav-btn { padding: 5px 8px; font-size: 10px; flex: 1 1 auto; text-align: center; }

      /* Control bar: mode buttons + game type wrap */
      .t3-controlbar { padding: 4px 8px; gap: 4px; }
      .t3-mode-group { gap: 4px; }
      .t3-mode-btn { padding: 6px 8px; min-width: 55px !important; font-size: 11px; }
      .t3-mode-btn input[type="checkbox"] { width: 14px; height: 14px; }
      .t3-gametype-group { margin-left: 0; gap: 4px; }
      .t3-gametype-btn { padding: 6px 8px; min-width: 55px !important; font-size: 11px; }

      /* Digit bar */
      .t3-digitbar { padding: 6px 8px; gap: 3px; }
      .t3-digit-btn { width: 30px; height: 30px; font-size: 13px; }
      .t3-digit-btn.all-btn { width: 40px; font-size: 11px; }
      .t3-filter-group { margin-left: 0; flex: 1 1 100%; justify-content: flex-start; gap: 8px; margin-top: 4px; }
      .t3-filter-label { font-size: 20px; }
      .t3-action-group { margin-left: 0; flex: 1 1 100%; margin-top: 4px; }
      .t3-motor-btn { padding: 5px 10px; font-size: 11px; }
      .t3-qty-group { font-size: 11px; }
      .t3-qty-input { width: 45px; padding: 4px; font-size: 12px; }
      .t3-lucky-btn { padding: 5px 10px; font-size: 11px; }

      /* Bet type bar */
      .t3-bettypebar { padding: 5px 8px; gap: 6px; }
      .t3-bettype-label { font-size: 11px; gap: 3px; }
      .t3-bettype-label input { width: 14px; height: 14px; }
      .t3-last-trans { margin-left: 0; font-size: 10px; flex: 1 1 100%; }

      /* Input bar */
      .t3-inputbar { padding: 6px 8px; gap: 6px; }
      .t3-add-number-input { width: 120px; padding: 6px 12px; font-size: 13px; }
      .t3-range-group { font-size: 11px; }
      .t3-range-input { width: 60px; padding: 4px; font-size: 12px; }
      .t3-rate-group { margin-left: 0; font-size: 11px; flex: 1 1 100%; margin-top: 2px; }

      /* Footer */
      .t3-footer { padding: 6px 8px; gap: 4px; }
      .t3-footer-barcode { max-width: 100px; font-size: 11px; padding: 6px 8px; }
      .t3-footer-btn { padding: 6px 10px; font-size: 11px; flex: 1 1 auto; }
      .t3-footer-btn.buy { max-width: none; font-size: 13px; }
      .t3-footer-btn.freebuy { max-width: none; font-size: 11px; }
      .t3-footer-total { min-width: 50px !important; font-size: 14px; padding: 5px 10px; }

      /* Bet list */
      .t3-bet-card { min-width: 56px; padding: 4px 6px; }
      .t3-bet-card .t3-bc-number { font-size: 14px; }
      .t3-bet-card .t3-bc-type { font-size: 9px; }
      .t3-bet-card .t3-bc-amount { font-size: 10px; }
      .t3-betlist-area { margin: 4px; padding: 6px; min-height: 120px; }

      /* Modal */
      .t3-howto-modal { width: 95vw; padding: 12px 8px; }
      .t3-howto-table { font-size: 10px; }
      .t3-howto-table th, .t3-howto-table td { padding: 4px 3px; }
    }
  `}</style>
);

export default Terminal3DStyles;