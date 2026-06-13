import React from 'react';

const terminalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700;800&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #root {
    height: auto; min-height: 100%; min-width: 1280px; overflow-x: auto; overflow-y: auto;
    background: #eeeeee;
    color: #1a1a1a;
    font-family: Arial, sans-serif;
    font-size: 12px;
    -webkit-font-smoothing: antialiased;
  }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #f5f5f5; }
  ::-webkit-scrollbar-thumb { background: #e91e8c; border-radius: 3px; }

  .lt-root {
    display: flex; flex-direction: column;
    min-width: 1280px;
    min-height: 100dvh;
    height: auto;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0 6px;
    background: #eeeeee;
  }

  /* ══════════════════════════════════════════════════════
     HEADER — Logo | LastDraw info | Number grid  (single combined row)
  ══════════════════════════════════════════════════════ */
  .lt-header {
    display: flex;
    align-items: stretch;
    flex-shrink: 0;
    min-height: 140px;
    background: #2a1a2e;
    border-bottom: 2px solid #1a1018;
    overflow: hidden;
  }

  .lt-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 14px 16px;
    min-width: 130px;
    background: #1e1020;
    border-right: 2px solid #3a2040;
    flex-shrink: 0;
  }
  .lt-logo-circle {
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.1;
  }
  .lt-logo-silver {
    font-size: 28px;
    font-weight: 800;
    color: #ff6b00;
    letter-spacing: 1px;
    font-family: Arial, sans-serif;
  }
  .lt-logo-coin {
    font-size: 11px;
    font-weight: 700;
    color: #e0c060;
    letter-spacing: 3px;
    margin-top: 2px;
  }

  .lt-lastdraw-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 12px 16px;
    min-width: 130px;
    flex-shrink: 0;
    background: #2a1a2e;
    border-right: 1px solid #3a2040;
  }
  .lt-lastdraw-label {
    font-size: 25px;
    font-weight: 800;
    color: #ffd700;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }
  .lt-lastdraw-date {
    font-size: 18px;
    font-weight: 600;
    color: #e0d0f0;
    line-height: 1.5;
  }

  .lt-lastdraw-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 3px;
    padding: 10px 12px;
    overflow: hidden;
    align-content: center;
  }
  .lt-draw-badge {
    border-radius: 12px;

    padding: 0 10px;

    text-align: center;

    font-size: 28px;

    font-weight: 800;

    letter-spacing: 0.4px;

    color: #fff;
    
    font-family: Arial, sans-serif;

    display: flex;

    align-items: center;

    justify-content: center;

    min-width: 68px;

    min-height: 52px;

    box-shadow:
      0 4px 10px rgba(0,0,0,0.32),
      inset 0 1px 0 rgba(255,255,255,0.15);

    border:
      1px solid rgba(255,255,255,0.08);

    transition:
      transform 0.15s ease,
      filter 0.15s ease;
  }
  .lt-draw-badge:hover {
  transform: translateY(-2px);
  filter: brightness(1.08);
  } 

  /* ══════════════════════════════════════════════════════
     INFO BAR — Today | Current Time | Timeslot | Remain | Balance
  ══════════════════════════════════════════════════════ */
  .lt-infobar {
    display: flex;
    align-items: stretch;
    flex-shrink: 0;
    height: 48px;
    border-bottom: 1px solid #333;
    overflow: hidden;
  }
  .lt-infobar-seg {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 0 8px;
    border-right: 1px solid rgba(255,255,255,0.12);
    white-space: nowrap;
    flex-shrink: 0;
  }
  .lt-infobar-seg--today   { background: #cc1155; }
  .lt-infobar-seg--time    { background: #222244; }
  .lt-infobar-seg--slot    { background: #cc1199; }
  .lt-infobar-seg--remain  { background: #333; flex: 1; justify-content: center; border-right: none; }
  .lt-infobar-seg--balance { background: #001a4d; padding-right: 16px; flex-shrink: 0; }

  .lt-infobar-key {
    font-size: 14px;
    font-weight: 700;
    color: rgba(255,255,255,0.85);
  }
  .lt-infobar-val {
    font-size: 14px;
    font-weight: 800;
    color: #fff;
  }
  .lt-infobar-val--remain  { color: #ff4444; font-size: 14px; }
  .lt-infobar-val--balance { color: #fff; font-size: 14px; font-weight: 800; }
  .lt-infobar-freepoints   { color: #00ddff; font-weight: 800; font-size: 14px; }

  /* ══════════════════════════════════════════════════════
     WELCOME BANNER
  ══════════════════════════════════════════════════════ */
  .lt-welcome-banner {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    height: 36px;
    background: #1a1a1a;
    color: #d8c8d8;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    border-bottom: 1px solid #333;
  }

  /* ══════════════════════════════════════════════════════
     NAV TABS
  ══════════════════════════════════════════════════════ */
  .lt-navtabs {
    display: flex;
    flex-shrink: 0;
    height: 52px;
    border-bottom: 1px solid #222;
  }
  .lt-navtab {
    flex: 1;
    border: none;
    padding: 0 4px;
    color: #fff;
    font-size: 50px;
    font-weight: 800;
    letter-spacing: 0.5px;
    font-family: inherit;
    cursor: pointer;
    border-right: 1px solid rgba(0,0,0,0.25);
    transition: filter 0.1s;
  }
  .lt-navtab:last-child { border-right: 0; }
  .lt-navtab:hover { filter: brightness(1.15); }
  .lt-navtab.active { box-shadow: inset 0 -3px 0 rgba(255,255,255,0.6); }

  /* ══════════════════════════════════════════════════════
     FILTER BAR
  ══════════════════════════════════════════════════════ */
  .lt-filterbar {
    display: flex; align-items: center;
    padding: 16px 16px; flex-shrink: 0;
    background: transparent;
    border-bottom: 2px solid #a09890;
    overflow-x: auto; flex-wrap: nowrap;
    gap: 10px;
  }
  .lt-filter-btn {
    padding: 12px 28px;
    border: 2px solid #999; border-radius: 4px;
    color: #1a1a1a; background: #d8d0c8;
    font-size: 20px; font-weight: 700; cursor: pointer;
    font-family: inherit; transition: all 0.12s; white-space: nowrap;
    display: flex; align-items: center; gap: 5px; flex-shrink: 0;
  }
  .lt-filter-btn:hover { background: #e0d8d0; }
  .lt-filter-btn.active { color: #fff; border-color: transparent; }
  .lt-filter-btn-all {
    background: #2f2f34;
    border-color: #1f1f22;
    color: #fff;
  }
  .lt-filter-btn-all:hover { background: #3a3a40; }
  .lt-filter-btn-all.active  { background: #2f2f34; }
  .lt-filter-btn-1019.active {
    background: #8a0061;
    color: #fff;
  }
  
  .lt-filter-btn-3039.active {
    background: #004d99;
    color: #fff;
  }
  
  .lt-filter-btn-5059.active {
    background: #007744;
    color: #fff;
  }
  .lt-filter-btn-3d.active   { background: #cc1199; }
  .lt-filter-btn-12d.active  { background: #9900cc; }
  .lt-filter-chk { width: 14px; height: 14px; cursor: pointer; accent-color: #cc1111; }
  .lt-filter-sep { flex: 1; min-width: 4px; }
  .lt-mod-check {
    display: flex; align-items: center; gap: 8px;
    font-size: 20px; font-weight: 700; color: #333; cursor: pointer;
    user-select: none; white-space: nowrap; flex-shrink: 0;
    padding: 12px 28px; border: 2px solid #aaa; border-radius: 4px;
    background: #d8d0c8; transition: all 0.12s;
  }
  .lt-mod-check:hover { background: #e0d8d0; }
  .lt-mod-check input { accent-color: #cc1199; width: 20px; height: 20px; cursor: pointer; }
  .lt-mod-check.active { color: #1a1a1a; background: #d0c8c0; border-color: #777; }

  /* ══════════════════════════════════════════════════════
     MAIN GRID AREA
  ══════════════════════════════════════════════════════ */
  .lt-grid-area { display: flex; flex: 1; overflow: visible; min-height: 0; }

  .lt-sidebar {
    display: flex; flex-direction: column;
    width: 140px; flex-shrink: 0;
    overflow-y: auto; background: transparent;
    border-right: 2px solid #a09890;
  }
  .lt-sidebar-spacer {
    height: 50px; flex-shrink: 0;
    background: #c0b8b0; border-bottom: 2px solid #a09890;
  }
  .lt-sidebar-all {
    display: flex; align-items: center; gap: 6px;
    padding: 0 12px; background: #2f2f34; height: 42px; flex-shrink: 0;
    cursor: pointer; font-size: 12px; font-weight: 800; color: #fff;
    border-bottom: 1px solid #a09890;
    user-select: none; letter-spacing: 0.5px;
  }
  .lt-sidebar-all:hover { filter: brightness(1.1); }
  .lt-sidebar-all input { accent-color: #fff; width: 14px; height: 14px; cursor: pointer; }
  .lt-sidebar-item {
    display: flex; align-items: center; gap: 6px;
    padding: 0 10px; height: 64px;
    border: none; background: transparent; color: #1a1a1a;
    font-size: 11px; font-weight: 700; cursor: pointer;
    font-family: inherit; text-align: left;
    border-bottom: 1px solid #b0a898; transition: background 0.1s;
    white-space: nowrap; width: 100%;
  }
  .lt-sidebar-item:hover { background: rgba(0,0,0,0.06); }
  .lt-sidebar-item.active {
    color: #000;
    border-left: 3px solid #9900cc;
    box-shadow: inset 0 0 0 1px rgba(0,0,0,0.2);
  }
  .lt-sidebar-item input { accent-color: #9900cc; width: 14px; height: 14px; cursor: pointer; flex-shrink: 0; }
  .lt-sidebar-dot { display: none; }
  .lt-sidebar-label { flex: 1; overflow: hidden; text-overflow: ellipsis; }

  /* Range tint for left sidebar rows only */
  .lt-sidebar-item--10 {
    background: #ffeb3b;
    color: #1a1a1a;
    border-bottom-color: rgba(255,255,255,0.22);
    box-shadow: inset 0 0 0 2px #000;
  }
  .lt-sidebar-item--10:hover { background: #ffe000; }

  .lt-sidebar-item--30 {
    background: #22aa22;
    color: #1a1a1a;
    border-bottom-color: rgba(255,255,255,0.22);
    box-shadow: inset 0 0 0 2px #000;
  }
  .lt-sidebar-item--30:hover { background: #2ab42a; }

  .lt-sidebar-item--50 {
    background: #9933cc;
    color: #1a1a1a;
    border-bottom-color: rgba(255,255,255,0.22);
    box-shadow: inset 0 0 0 2px #000;
  }
  .lt-sidebar-item--50:hover { background: #a040d4; }

  .lt-sidebar-item--10.active,
  .lt-sidebar-item--30.active,
  .lt-sidebar-item--50.active {
    color: #000;
    filter: none;
    border-left: 3px solid #111;
  }

  .lt-sidebar-item--10 input,
  .lt-sidebar-item--30 input,
  .lt-sidebar-item--50 input {
    accent-color: #111;
  }

  .lt-grid-scroll { flex: 1; overflow: auto; background: transparent; }

  .lt-grid-table { width: 100%; border-collapse: collapse; min-width: 700px; table-layout: fixed; }

  /* Column width classes — override-able on mobile */
  .lt-col-rowlabel { width: 26px; }
  .lt-col-block    { width: 58px; }
  .lt-col-digit    { width: 66px; }
  .lt-col-qty      { width: 50px; }
  .lt-col-amt      { width: 50px; }
  .lt-grid-table thead tr.row-nums th {
    position: sticky; top: 0; z-index: 3;
    background: #c0b8b0; color: #555;
    font-size: 8px; font-weight: 500;
    padding: 2px 1px; text-align: center; border-bottom: 0;
    border-right: 1px solid #b0a898;
  }
  .lt-grid-table thead tr.row-labels th {
    position: sticky; top: 14px; z-index: 3;
    background: #c0b8b0; color: #1a1a1a;
    font-size: 10px; font-weight: 800;
    padding: 6px 3px; border-bottom: 2px solid #a09890;
    border-right: 1px solid #b0a898; text-align: center;
  }
  .lt-grid-table thead tr.row-nums th,
  .lt-grid-table thead tr.row-labels th { box-shadow: inset 0 1px 0 #cbc3ba; }
  .lt-grid-table thead tr.row-labels th.col-block { color: #1a1a1a; }
  .lt-grid-table thead tr.row-labels th.col-qty { background: #8b1a6b; color: #fff; font-weight: 800; }
  .lt-grid-table thead tr.row-labels th.col-amt { background: #8b1a6b; color: #fff; font-weight: 800; }
  .lt-grid-table td {
    padding: 5px 4px; text-align: center;
    border-bottom: 1px solid #b8b0a8;
    border-right: 1px solid #b8b0a8; vertical-align: middle;
  }
  .lt-grid-table tr.lt-fill-row { height: 52px; }
  .lt-grid-table tr.lt-data-row { height: 82px; }
  .lt-grid-table tr:hover td { background: rgba(0,0,0,0.03); }
  .lt-row-label {
    font-size: 10px; font-weight: 800; color: #333;
    width: 26px; background: #c0b8b0 !important;
    border-right: 2px solid #a09890 !important;
  }

  .lt-block-input {
    width: 52px; height: 28px; border: 2px solid #7777bb;
    background: #fff; color: #1a1a1a;
    font-family: Arial, sans-serif;
    font-size: 11px; text-align: center;
    padding: 2px; border-radius: 2px; outline: none;
  }
  .lt-block-input:focus { border-color: #3333cc; box-shadow: 0 0 3px rgba(50,50,200,0.3); }
  .lt-block-input:disabled { background: #e0d8d0; color: #999; border-color: #bbb; cursor: not-allowed; }

  .lt-cell-number-strip { height: 22px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: 2px; }
  .lt-cell-number-strip-empty { visibility: hidden; }
  .lt-cell-number { font-size: 20px; line-height: 1; color: #444; font-weight: 600; letter-spacing: 0.2px; text-align: center; }

  .lt-cell-input {
    width: 60px; height: 38px; border: 2px solid #7777bb;
    background: #fff; color: #1a1a1a;
    font-family: Arial, sans-serif;
    font-size: 11px; text-align: center;
    padding: 2px 3px; border-radius: 2px; outline: none;
    transition: border-color 0.1s;
  }
  .lt-cell-input:focus { border-color: #3333cc; box-shadow: 0 0 3px rgba(50,50,200,0.25); }
  .lt-cell-input.filled { background: #fff8e0; border-color: #cc6600; color: #1a1a1a; font-weight: 700; }
  .lt-cell-input:disabled { background: #e0d8d0; color: #999; border-color: #bbb; cursor: not-allowed; }
  .lt-cell-input:disabled::placeholder,
  .lt-block-input:disabled::placeholder { color: #aaa; opacity: 1; }

  .lt-fill-col-input {
    width: 60px; height: 38px; border: 2px solid #7777bb;
    background: #fff; color: #1a1a1a;
    font-family: Arial, sans-serif;
    font-size: 11px; text-align: center;
    padding: 2px; border-radius: 2px; outline: none;
  }
  .lt-fill-col-input:focus { border-color: #3333cc; }
  .lt-fill-col-input:disabled { background: #e0d8d0; color: #999; border-color: #bbb; cursor: not-allowed; }

  .lt-qty-val { font-size: 12px; font-weight: 700; color: #fff; background: #8b1a6b !important; min-width: 36px; border-right: 1px solid #7a1560 !important; }
  .lt-amt-val { font-size: 12px; font-weight: 700; color: #fff; background: #8b1a6b !important; min-width: 36px; }
  .lt-total-row td { background: #b8b0a8 !important; border-top: 2px solid #a09890; }
  .lt-total-label { font-size: 9px; font-weight: 800; color: #333; text-align: right; padding-right: 6px; }

  .lt-grid-footer-inline {
    min-width: 700px;
    margin-top: 6px;
  }

  /* ══════════════════════════════════════════════════════
     FOOTER
  ══════════════════════════════════════════════════════ */
  .lt-footer {
    display: flex; align-items: stretch; flex-shrink: 0;
    border-top: 2px solid #a09890; background: transparent; min-height: 44px;
  }
  .lt-footer-btn {
    padding: 8px 14px; border: none; color: #fff;
    font-weight: 800; font-size: 11px; cursor: pointer;
    font-family: inherit; line-height: 1.3;
    border-right: 1px solid rgba(0,0,0,0.2); white-space: nowrap;
    background: #cc1111; transition: filter 0.1s;
  }
  .lt-footer-btn:hover { filter: brightness(1.1); }
  .lt-footer-mid { flex: 1; display: flex; align-items: center; gap: 8px; padding: 4px 12px; }
  .lt-footer-txn { font-size: 10px; color: #444; font-weight: 600; }
  .lt-barcode-input {
    width: 200px; padding: 6px 8px;
    border: 2px solid #aaa; border-radius: 3px;
    background: #e8e0d8; color: #1a1a1a;
    font-size: 10px; font-family: inherit; outline: none;
  }
  .lt-barcode-input:focus { border-color: #5555cc; }
  .lt-buynow {
    background: #cc1199; padding: 8px 20px; border: none; color: #fff;
    font-weight: 800; font-size: 12px; cursor: pointer;
    font-family: inherit; white-space: nowrap;
    transition: filter 0.15s; border-left: 1px solid rgba(0,0,0,0.2);
  }
  .lt-buynow:hover { filter: brightness(1.1); }
  .lt-footer-totals { display: flex; }
  .lt-footer-total {
    min-width: 50px; border: none; cursor: default;
    font-family: inherit; font-weight: 800; font-size: 14px;
    color: #fff; background: #228b22;
    text-align: center; padding: 0 12px;
    border-left: 1px solid rgba(0,0,0,0.2);
    display: flex; align-items: center; justify-content: center;
  }

  /* ══════════════════════════════════════════════════════
     RESPONSIVE — Tablet (≤900px)
  ══════════════════════════════════════════════════════ */
  @media (max-width: 1px) {
    html, body, #root {
      overflow: auto;
      height: auto;
      min-height: 100%;
    }
    .lt-root {
      display: block;
      height: auto;
      min-height: 0;
      overflow: visible;
    }
    .lt-grid-area {
      flex: none;
      min-height: auto;
      overflow: visible;
    }
    .lt-grid-scroll {
      overflow-x: auto;
      overflow-y: visible;
    }
    .lt-header { min-height: 88px; }
    .lt-logo { min-width: 100px; }
    .lt-logo-silver { font-size: 20px; }
    .lt-lastdraw-info { min-width: 100px; padding: 6px 10px; }
    .lt-draw-badge { font-size: 10px; min-height: 22px; }
    .lt-sidebar { width: 120px; }
    .lt-cell-input { width: 48px; }
    .lt-block-input { width: 42px; }
    .lt-fill-col-input { width: 48px; }
    .lt-grid-table { min-width: 600px; }
    .lt-grid-footer-inline { min-width: 600px; margin-top: 4px; }
    .lt-footer-btn { padding: 7px 10px; font-size: 10px; }
    .lt-footer-mid { gap: 6px; padding: 4px 8px; }
    .lt-footer-txn { font-size: 9px; }
    .lt-barcode-input { width: 110px; padding: 4px 6px; font-size: 9px; }
    .lt-buynow { padding: 7px 10px; font-size: 10px; }
    .lt-footer-total { min-width: 36px; padding: 0 8px; font-size: 12px; }
  }

  /* ══════════════════════════════════════════════════════
     RESPONSIVE — Mobile (≤600px) — NO horizontal scroll
  ══════════════════════════════════════════════════════ */
  @media (max-width: 1px) {
    html, body, #root {
      overflow-x: hidden;
      overflow-y: auto;
      height: auto;
      min-height: 100%;
      font-size: 10px;
    }

    .lt-root {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: auto;
      min-height: 100dvh;
      overflow-x: hidden;
      overflow-y: auto;
    }

    /* ── HEADER ── */
    .lt-header { min-height: auto; flex-wrap: nowrap; width: 100%; }
    .lt-logo { min-width: 52px; padding: 6px 7px; }
    .lt-logo-silver { font-size: 14px; letter-spacing: 0; }
    .lt-logo-coin   { font-size: 8px; letter-spacing: 1px; }
    .lt-lastdraw-info { min-width: 56px; padding: 4px 5px; flex-shrink: 0; }
    .lt-lastdraw-label { font-size: 13px; }
    .lt-lastdraw-date  { font-size: 13px; line-height: 1.4; }
    .lt-lastdraw-grid { flex: 1; gap: 2px; padding: 4px 5px; }
    .lt-draw-badge { font-size: 8px; min-height: 16px; border-radius: 2px; }

    /* ── INFO BAR — 3 compact rows ── */
    .lt-infobar { flex-wrap: wrap; height: auto; }
    .lt-infobar-seg {
      height: 26px;
      padding: 0 6px;
      flex-shrink: 0;
    }
    .lt-infobar-key { font-size: 8px; }
    .lt-infobar-val { font-size: 9px; }
    .lt-infobar-val--remain { font-size: 15px; }
    .lt-infobar-freepoints  { font-size: 9px; }
    .lt-infobar-seg--today   { flex: 0 0 auto; }
    .lt-infobar-seg--time    { flex: 0 0 auto; }
    .lt-infobar-seg--slot    { flex: 1 0 auto; }
    .lt-infobar-seg--remain  { flex: 0 0 auto; border-right: 1px solid rgba(255,255,255,0.12); }
    .lt-infobar-seg--balance { flex: 1; padding: 0 8px; }

    /* ── NAV TABS ── */
    .lt-navtabs { height: auto; flex-wrap: wrap; }
    .lt-navtab  { flex: 1 1 33%; min-width: 0; height: 34px; font-size: 9px; padding: 0 2px; letter-spacing: 0; }

    /* ── FILTER BAR ── */
    .lt-filterbar { flex-wrap: wrap; gap: 4px; padding: 5px 6px; overflow-x: visible; }
    .lt-filter-btn { padding: 4px 8px; font-size: 9px; border-radius: 3px; }
    .lt-mod-check  { padding: 4px 7px; font-size: 9px; }
    .lt-filter-sep { display: none; }

    /* ── GRID AREA ── */
    .lt-grid-area { display: flex; flex-direction: row; width: 100%; overflow: visible; min-height: 0; }

    /* ── SIDEBAR — very compact ── */
    .lt-sidebar { width: 68px; flex-shrink: 0; }
    .lt-sidebar-spacer { height: 34px; }
    .lt-sidebar-all { height: 30px; padding: 0 5px; font-size: 9px; gap: 3px; }
    .lt-sidebar-all input { width: 11px; height: 11px; }
    .lt-sidebar-item { height: 42px; padding: 0 5px; font-size: 8.5px; gap: 3px; }
    .lt-sidebar-item input { width: 11px; height: 11px; }

    /* ── GRID SCROLL — fills remaining width, no horiz scroll ── */
    .lt-grid-scroll {
      flex: 1;
      overflow-x: hidden;
      overflow-y: visible;
      min-width: 0;
      width: 0;
    }

    /* ── TABLE — fluid, no min-width ── */
    .lt-grid-table {
      width: 100%;
      min-width: unset !important;
      table-layout: fixed;
    }

    /* Column widths on mobile — must fit ~260px (phone width minus 68px sidebar) */
    /* Total: 14 + 28 + 10*19 + 18 + 18 = 268px — fits on 360px phone - 68px sidebar = 292px ✓ */
    .lt-col-rowlabel { width: 14px !important; }
    .lt-col-block    { width: 28px !important; }
    .lt-col-digit    { width: 19px !important; }
    .lt-col-qty      { width: 18px !important; }
    .lt-col-amt      { width: 18px !important; }

    .lt-grid-table thead tr.row-nums th,
    .lt-grid-table thead tr.row-labels th { font-size: 6px; padding: 1px 0; }

    .lt-row-label { width: 14px !important; font-size: 7px; padding: 0 1px; }

    /* All inputs fill their cell completely */
    .lt-cell-input,
    .lt-fill-col-input {
      width: 100%;
      min-width: 0;
      height: 20px;
      font-size: 8px;
      padding: 0;
      border-width: 1px;
    }
    .lt-block-input {
      width: 100%;
      min-width: 0;
      height: 20px;
      font-size: 8px;
      padding: 0;
      border-width: 1px;
    }

    /* Number label above each cell */
    .lt-cell-number-strip {height: 22px; margin-bottom: 1px; }
    .lt-cell-number {
    font-size: 20px;
    line-height: 1;
    color: #222;
    font-weight: 800;
    letter-spacing: 0.3px;
    text-align: center;
    }

    /* Row heights */
    .lt-grid-table tr.lt-fill-row { height: 24px; }
    .lt-grid-table tr.lt-data-row { height: 36px; }

    /* Qty/Amount value cells */
    .lt-qty-val,
    .lt-amt-val { font-size: 8px; min-width: 18px; padding: 2px 1px; }
    .lt-total-label { font-size: 6px; }

    /* ── FOOTER ── */
    .lt-grid-footer-inline { min-width: unset !important; width: 100%; margin-top: 0; }
    .lt-footer { flex-wrap: wrap; min-height: auto; }
    .lt-footer-btn { padding: 6px 8px; font-size: 9px; flex: 0 0 auto; }
    .lt-footer-mid {
      flex: 1 1 100%;
      order: 10;
      padding: 4px 8px;
      gap: 6px;
    }
    .lt-footer-txn { font-size: 8px; }
    .lt-barcode-input { flex: 1; width: auto; min-width: 0; padding: 4px 6px; font-size: 9px; }
    .lt-buynow { flex: 1; padding: 8px 10px; font-size: 10px; }
    .lt-footer-totals { flex: 0 0 auto; }
    .lt-footer-total { min-width: 26px; padding: 0 6px; font-size: 11px; }
  }
`;

const TerminalStyles: React.FC = () => <style>{terminalStyles}</style>;

export default TerminalStyles;