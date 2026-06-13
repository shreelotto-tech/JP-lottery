import type { BetEntry } from './types';
import { formatSlotLabelAsRange } from './utils';
import { supabase } from '../../lib/supabase';

const getSlotEndTime = (slotLabel: string): string => {
  const range = formatSlotLabelAsRange(slotLabel);
  const normalized = range.replace(/\s+/g, ' ').trim();

  if (normalized.toUpperCase().includes(' TO ')) {
    const parts = normalized.split(/\s+TO\s+/i);
    return parts[1]?.trim() || range;
  }

  if (normalized.includes('-')) {
    const parts = normalized.split('-');
    return parts[1]?.trim() || range;
  }

  return range;
};

const isMeaningfulLabel = (value: string): boolean => value.trim().toLowerCase() !== 'none';

interface ReceiptParams {
  bets: BetEntry[];
  desk: number;
  selectedGroupLabels: string;
  selectedModsText: string;
  drawDate?: string;
  drawEndTime?: string;
  receiptBarcode?: string;
}

interface OpenBetReceiptWindowParams extends ReceiptParams {}

/**
 * Generates the receipt HTML string — pure, no side-effects.
 */
export const generateReceiptHtml = ({
  bets,
  desk,
  drawDate,
  drawEndTime,
  selectedGroupLabels,
  selectedModsText,
  receiptBarcode,
}: ReceiptParams): string => {
  const sortedBets = [...bets].sort((a, b) => a.number - b.number);
  const totalQty = sortedBets.reduce((s, b) => s + b.quantity, 0);
  const totalAmountValue = totalQty * 2;
  const drawParts = [drawDate, drawEndTime].filter((part): part is string => Boolean(part && part.trim()));
  const drawText = drawParts.join(' | ');
  const now = new Date();
  const generatedSerial = `${now.getTime()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  const serialId = receiptBarcode || generatedSerial;
  const barcodeValue = receiptBarcode || serialId.slice(-10);

  // Group bets by thousands bucket: 1000s, 3000s, 5000s, etc.
  const groups = new Map<string, BetEntry[]>();
  for (const bet of sortedBets) {
    const bucket = Math.floor(bet.number / 1000) * 1000;
    const key = `${bucket}s`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(bet);
  }

  // Build rows: 5 pairs per row inside each group
  const COLS = 5;

  const buildGroupHtml = (label: string, entries: BetEntry[]): string => {
    const rows: string[] = [];
    for (let i = 0; i < entries.length; i += COLS) {
      const chunk = entries.slice(i, i + COLS);
      const cells = chunk
        .map(b => `<td class="cn">${b.number}</td><td class="cq">${b.quantity}</td>`)
        .join('');
      // Pad incomplete rows so the table stays aligned
      const padding = COLS - chunk.length;
      const padCells = Array(padding).fill('<td class="cn"></td><td class="cq"></td>').join('');
      rows.push(`<tr>${cells}${padCells}</tr>`);
    }

    return `
      <tr class="group-header">
        <td colspan="${COLS * 2}" class="group-label">${label}</td>
      </tr>
      <tr class="col-header">
        ${Array(COLS).fill('<td class="cn">No.</td><td class="cq">Qt</td>').join('')}
      </tr>
      ${rows.join('')}
      <tr class="group-sep"><td colspan="${COLS * 2}"></td></tr>
    `;
  };

  const groupsHtml = [...groups.entries()]
    .map(([label, entries]) => buildGroupHtml(label, entries))
    .join('');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Bet Receipt</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; background: #fff; color: #111; }
      .receipt { width: 360px; margin: 0 auto; padding: 10px; }

      .title { font-size: 28px; font-weight: 800; }
      .subtitle { font-size: 13px; font-weight: 700; }
      .line { border-top: 1px dotted #555; margin: 6px 0; }
      .meta { font-size: 12px; line-height: 1.5; font-weight: bold;}
      .summary { font-size: 13px; font-weight: 700; }

      /* ── Bets table ── */
      .bets-table {
        width: 100%;
        border-collapse: collapse;
        font-family: 'Courier New', monospace;
        font-size: 17px;
        table-layout: auto;
      }
      /* 5 pairs = 10 cols. No. col wider, Qt. col tight */
      .bets-table td { padding: 1px 2px; overflow: hidden; }
      .bets-table .cn { width: 44px; font-weight: 900; font-family: Arial, sans-serif; }
      .bets-table .cq { width: 18px; color: #333; }

      .group-header .group-label {
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #555;
        padding-top: 5px;
        padding-bottom: 1px;
      }
      .col-header td {
        font-size: 13px;
        font-weight: 700;
        color: #777;
        border-bottom: 1px dotted #aaa;
        padding-bottom: 2px;
      }
      .group-sep td {
        border-bottom: 1px dotted #ccc;
        padding: 2px 0;
      }

      /* ── Barcode ── */
      .barcode-wrap { text-align: center; margin-top: 10px; }
      .barcode {
        height: 50px;
        width: 200px;
        margin: 0 auto 4px;
        background: repeating-linear-gradient(
          90deg,
          #000 0px, #000 2px,
          #fff 2px, #fff 4px,
          #000 4px, #000 5px,
          #fff 5px, #fff 7px
        );
      }
      .barcode-num { letter-spacing: 2px; font-size: 16px; font-weight: 700; }

      /* ── Actions ── */
      .actions { margin-top: 8px; display: flex; gap: 8px; }
      button { padding: 4px 12px; font-size: 16px; cursor: pointer; }
      @media print { .actions { display: none; } }
    </style>
  </head>
  <body>
    <div class="receipt">
      <div class="title">Shree Lotto</div>
      <div class="subtitle">Fun Coupon valid for 10 Days</div>
      <div class="subtitle">Free Coupon for Fun Only</div>

      <div class="meta" style="margin-top:4px;">
        <div>Desk: ${desk}</div>
        ${drawText ? `<div>Draw: ${drawText}</div>` : ''}
        ${selectedGroupLabels && isMeaningfulLabel(selectedGroupLabels) ? `<div>${selectedGroupLabels}</div>` : ''}
        ${selectedModsText && isMeaningfulLabel(selectedModsText) ? `<div>${selectedModsText}</div>` : ''}
      </div>

      <div class="line"></div>
      <div class="summary">Qty:${totalQty}, Point: ${totalAmountValue}</div>
      <div class="line"></div>

      <table class="bets-table">
        <tbody>
          ${groupsHtml}
        </tbody>
      </table>

      <div class="line"></div>

      <div class="meta">
        <div>Time: ${now.toLocaleString('en-GB', { hour12: false })}</div>
        <div>Serial Id: ${serialId}</div>
      </div>

      <div class="barcode-wrap">
        <div class="barcode"></div>
        <div class="barcode-num">${barcodeValue}</div>
      </div>

      <div class="line"></div>

      <div class="actions">
        <button onclick="goBackHome()">Back to Home</button>
        <button onclick="window.print()">Print</button>
        <button onclick="shareReceipt()">Share</button>
      </div>
    </div>

    <script>
      var RECEIPT_TEXT = ${JSON.stringify(
        [
          '🎟 Shree Lotto Receipt',
          `Desk: ${desk}`,
          ...(drawText ? [`Draw: ${drawText}`] : []),
          ...(selectedGroupLabels && isMeaningfulLabel(selectedGroupLabels) ? [selectedGroupLabels] : []),
          `Qty: ${totalQty}, Point: ${totalAmountValue}`,
          `Numbers: ${sortedBets.map(b => b.number).join(', ')}`,
          `Serial: ${serialId}`,
        ].join('\n')
      )};

      function goBackHome() {
        if (window.opener && !window.opener.closed) {
          window.opener.location.href = '/';
          window.opener.focus();
          window.close();
          return;
        }
        window.location.href = '/';
      }

      async function shareReceipt() {
        const el = document.querySelector('.receipt');
        const actions = document.querySelector('.actions');
        actions.style.display = 'none';
        try {
          const canvas = await html2canvas(el, { scale: 2, useCORS: true });
          actions.style.display = '';
          const { jsPDF } = window.jspdf;
          const w = canvas.width / 2, h = canvas.height / 2;
          const pdf = new jsPDF({ unit: 'px', format: [w, h], orientation: h > w ? 'portrait' : 'landscape' });
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h);
          const blob = pdf.output('blob');
          const pdfFile = new File([blob], 'receipt.pdf', { type: 'application/pdf' });
          if (navigator.share) {
            if (navigator.canShare({ files: [pdfFile] })) {
              try {
                await navigator.share({ files: [pdfFile], title: 'Lottery Receipt' });
                return;
              } catch (e) {
                if (e.name === 'AbortError') return;
              }
            }
            const imgBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const imgFile = new File([imgBlob], 'receipt.png', { type: 'image/png' });
            if (navigator.canShare({ files: [imgFile] })) {
              try {
                await navigator.share({ files: [imgFile], title: 'Lottery Receipt' });
                return;
              } catch (e) {
                if (e.name === 'AbortError') return;
              }
            }
            try {
              await navigator.share({ text: RECEIPT_TEXT, title: 'Lottery Receipt' });
              return;
            } catch (e) {
              if (e.name === 'AbortError') return;
            }
          }
          var waUrl = 'https://wa.me/?text=' + encodeURIComponent(RECEIPT_TEXT);
          window.open(waUrl, '_blank');
        } catch (e) {
          actions.style.display = '';
          alert('Could not generate receipt. Try Print instead.');
        }
      }
    </script>
  </body>
</html>`;
};

export const generateWinReceiptHtml = ({
  winningNumbers,
  barcode,
  drawDate,
  slotLabel,
  totalPayout,
  winningCount,
}: {
  winningNumbers: number[];
  barcode: string;
  drawDate: string;
  slotLabel: string;
  totalPayout: number;
  winningCount: number;
}): string => {
  const sorted = [...winningNumbers].sort((a, b) => a - b);
  const totalAmount = totalPayout;
  const now = new Date();
  const slotEndTime = getSlotEndTime(slotLabel);

  const chunkSize = 6;
  const chunks: number[][] = [];
  for (let i = 0; i < sorted.length; i += chunkSize) {
    chunks.push(sorted.slice(i, i + chunkSize));
  }
  const numbersHtml = chunks
    .map((chunk) => `<div class="num-row">${chunk.map((n) => `<span class="num">${n}</span>`).join('')}</div>`)
    .join('');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Win Receipt</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 10px; color: #111; }
      .receipt { width: 360px; margin: 0 auto; }
      .title { font-size: 32px; font-weight: 800; margin: 0 0 4px; }
      .win-badge { display: inline-block; background: #1b5e20; color: #fff; font-size: 13px; font-weight: 800; padding: 2px 10px; border-radius: 4px; margin-bottom: 6px; letter-spacing: 1px; }
      .line { border-top: 1px dotted #555; margin: 8px 0; }
      .meta { font-size: 13px; line-height: 1.5; }
      .summary { font-size: 15px; font-weight: 800; line-height: 1.6; }
      .total-amount { color: #1b5e20; font-size: 18px; }
      .num-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px; font-family: 'Courier New', monospace; font-size: 13px; }
      .num { background: #e8f5e9; border: 1px solid #a5d6a7; border-radius: 3px; padding: 2px 6px; font-weight: 700; }
      .barcode-wrap { text-align: center; margin-top: 12px; }
      .barcode { height: 56px; margin: 0 auto 4px; width: 180px; background: repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 5px, #fff 5px, #fff 7px); }
      .barcode-num { letter-spacing: 2px; font-size: 18px; font-weight: 700; }
      .actions { margin-top: 10px; display: flex; gap: 8px; }
      button { padding: 4px 10px; font-size: 20px; }
      @media print { .actions { display: none; } }
    </style>
  </head>
  <body>
    <div class="receipt">
      <div class="title">Shree Lotto</div>
      <div class="win-badge">WIN RECEIPT</div>
      <div class="meta">
        <div>Draw: ${drawDate} &nbsp;|&nbsp; ${slotEndTime}</div>
        <div>Claimed: ${now.toLocaleString('en-IN', { hour12: true })}</div>
      </div>
      <div class="line"></div>
      <div class="summary">
        <div>Total Winning Numbers: ${winningCount}</div>
        <div class="total-amount">Total Amount: &#8377;${totalAmount}</div>
      </div>
      <div class="line"></div>
      <div>${numbersHtml}</div>
      <div class="line"></div>
      <div class="barcode-wrap">
        <div class="barcode"></div>
        <div class="barcode-num">${barcode}</div>
      </div>
      <div class="line"></div>
      <div class="actions">
        <button onclick="window.print()">Print</button>
        <button onclick="window.close()">Close</button>
      </div>
    </div>
  </body>
</html>`;
};

export const generateWin3DReceiptHtml = ({
  winningBets,
  barcode,
  drawDate,
  slotLabel,
  totalPayout,
}: {
  winningBets: { number: number; mode: string; betType: string; payout: number }[];
  barcode: string;
  drawDate: string;
  slotLabel: string;
  totalPayout: number;
}): string => {
  const now = new Date();
  const slotEndTime = getSlotEndTime(slotLabel);

  const modeColors: Record<string, { bg: string; border: string; color: string }> = {
    A: { bg: '#e8f5e9', border: '#a5d6a7', color: '#1b5e20' },
    B: { bg: '#fce4ec', border: '#f48fb1', color: '#b71c1c' },
    C: { bg: '#e3f2fd', border: '#90caf9', color: '#1565c0' },
  };

  const rowsHtml = winningBets.map((b) => {
    const c = modeColors[b.mode] ?? { bg: '#f5f5f5', border: '#bbb', color: '#333' };
    return `<tr>
      <td class="tc num-cell">${String(b.number).padStart(3, '0')}</td>
      <td class="tc"><span class="mode-badge" style="background:${c.bg};border:1px solid ${c.border};color:${c.color};">${b.mode}</span></td>
      <td class="tc">${b.betType}</td>
      <td class="tc payout-cell">${b.payout}</td>
    </tr>`;
  }).join('');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>3D Win Receipt</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body { font-family: Arial, sans-serif; margin: 10px; color: #111; }
      .receipt { width: 360px; margin: 0 auto; padding: 10px; }
      .title { font-size: 22px; font-weight: 900; }
      .game-badge { display: inline-block; background: #6a0dad; color: #fff; font-size: 12px; font-weight: 800; padding: 2px 8px; border-radius: 4px; vertical-align: middle; margin-left: 6px; }
      .win-badge { display: inline-block; background: #1b5e20; color: #fff; font-size: 12px; font-weight: 800; padding: 2px 10px; border-radius: 4px; margin: 4px 0 6px; letter-spacing: 1px; }
      .line { border-top: 1px dotted #555; margin: 6px 0; }
      .meta { font-size: 13px; font-weight: 700; line-height: 1.6; }
      .bet-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 4px; }
      .bet-table th { background: #2a1a2e; color: #fff; padding: 4px 6px; font-size: 11px; font-weight: 800; text-align: center; }
      .bet-table td { padding: 4px 6px; border-bottom: 1px dotted #ccc; font-size: 12px; }
      .tc { text-align: center; }
      .num-cell { font-family: 'Courier New', monospace; font-weight: 800; font-size: 14px; letter-spacing: 2px; color: #2a1a2e; }
      .payout-cell { font-weight: 800; color: #1b5e20; }
      .mode-badge { display: inline-block; padding: 1px 8px; border-radius: 3px; font-size: 11px; font-weight: 800; }
      .total-row td { border-top: 2px solid #555; font-weight: 800; font-size: 14px; padding-top: 6px; }
      .total-label { text-align: right; padding-right: 8px; }
      .total-amount { color: #1b5e20; font-size: 16px; }
      .barcode-wrap { text-align: center; margin-top: 10px; }
      .barcode { height: 50px; width: 200px; margin: 0 auto 4px; background: repeating-linear-gradient(90deg,#000 0px,#000 2px,#fff 2px,#fff 4px,#000 4px,#000 5px,#fff 5px,#fff 7px); }
      .barcode-num { letter-spacing: 2px; font-size: 16px; font-weight: 700; }
      .actions { margin-top: 10px; display: flex; gap: 10px; }
      .actions button { padding: 4px 14px; font-size: 14px; cursor: pointer; }
      @media print { .actions { display: none; } }
    </style>
  </head>
  <body>
    <div class="receipt">
      <div class="title">Shree Lotto <span class="game-badge">3D</span></div>
      <div class="win-badge">&#9733; WIN RECEIPT</div>
      <div class="meta">
        <div>Draw: ${drawDate} &nbsp;|&nbsp; ${slotEndTime}</div>
        <div>Claimed: ${now.toLocaleString('en-IN', { hour12: true })}</div>
        <div>Serial: ${barcode}</div>
      </div>
      <div class="line"></div>
      <table class="bet-table">
        <thead>
          <tr>
            <th>Number</th>
            <th>Mode</th>
            <th>Type</th>
            <th>Winnings</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr class="total-row">
            <td colspan="3" class="total-label">Total Winnings</td>
            <td class="tc total-amount">${totalPayout}</td>
          </tr>
        </tbody>
      </table>
      <div class="line"></div>
      <div class="barcode-wrap">
        <div class="barcode"></div>
        <div class="barcode-num">${barcode.slice(-10)}</div>
      </div>
      <div class="line"></div>
      <div class="actions">
        <button onclick="window.print()">Print</button>
        <button onclick="window.close()">Close</button>
      </div>
    </div>
  </body>
</html>`;
};

/**
 * Uploads receipt HTML to Supabase Storage and returns the public URL.
 */
export const uploadReceiptToStorage = async (
  userId: string,
  barcode: string,
  htmlContent: string,
): Promise<string | null> => {
  try {
    const filePath = `${userId}/${barcode}.html`;
    const blob = new Blob([htmlContent], { type: 'text/html' });

    const { error } = await supabase.storage
      .from('receipts')
      .upload(filePath, blob, {
        contentType: 'text/html',
        upsert: true,
      });

    if (error) {
      console.error('Failed to upload receipt:', error.message);
      return null;
    }

    const { data } = supabase.storage.from('receipts').getPublicUrl(filePath);
    return data.publicUrl ?? null;
  } catch (err) {
    console.error('Unexpected error uploading receipt:', err);
    return null;
  }
};

export const saveReceiptUrlToBets = async (
  barcode: string,
  receiptUrl: string,
): Promise<void> => {
  const { error } = await supabase
    .from('bets')
    .update({ receipt_url: receiptUrl })
    .eq('barcode', barcode);

  if (error) {
    console.error('Failed to save receipt_url to bets:', error.message);
  }
};

export const openBetReceiptWindow = ({
  bets,
  desk,
  drawDate,
  drawEndTime,
  selectedGroupLabels,
  selectedModsText,
  receiptBarcode,
}: OpenBetReceiptWindowParams): boolean => {
  if (bets.length === 0) return false;

  const receiptHtml = generateReceiptHtml({
    bets,
    desk,
    drawDate,
    drawEndTime,
    selectedGroupLabels,
    selectedModsText,
    receiptBarcode,
  });

  const blob = new Blob([receiptHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  if (!printWindow) return false;
  return true;
};

export const openCombinedReceiptWindow = (receiptsParams: ReceiptParams[]): boolean => {
  if (receiptsParams.length === 0) return false;

  const extractBody = (html: string): string => {
    const m = html.match(/<body>([\s\S]*?)<\/body>/i);
    return m ? m[1] : html;
  };

  const htmlParts = receiptsParams.map((p) => generateReceiptHtml(p));
  const separator = `<hr style="border:2px dashed #555;margin:20px 0;" />`;
  const combinedBody = htmlParts.map(extractBody).join(separator);
  const headMatch = htmlParts[0].match(/<head>([\s\S]*?)<\/head>/i);

  const combinedText = receiptsParams.map((p, i) => {
    const sortedBets = [...p.bets].sort((a, b) => a.number - b.number);
    const totalQty = sortedBets.reduce((s, b) => s + b.quantity, 0);
    const drawParts = [p.drawDate, p.drawEndTime].filter(Boolean);
    return [
      `--- Receipt ${i + 1} ---`,
      `Desk: ${p.desk}`,
      ...(drawParts.length ? [`Draw: ${drawParts.join(' | ')}`] : []),
      `Qty: ${totalQty}, Point: ${totalQty * 2}`,
      `Numbers: ${sortedBets.map(b => b.number).join(', ')}`,
      ...(p.receiptBarcode ? [`Serial: ${p.receiptBarcode}`] : []),
    ].join('\n');
  }).join('\n\n');

  const shareAllScript = `
<script>
  var ALL_RECEIPT_TEXT = ${JSON.stringify(`🎟 Shree Lotto Receipts\n\n${combinedText}`)};
  async function shareAll() {
    var allActions = document.querySelectorAll('.actions');
    allActions.forEach(function(el) { el.style.display = 'none'; });
    try {
      var canvas = await html2canvas(document.body, { scale: 2, useCORS: true });
      allActions.forEach(function(el) { el.style.display = ''; });
      var { jsPDF } = window.jspdf;
      var w = canvas.width / 2, h = canvas.height / 2;
      var pdf = new jsPDF({ unit: 'px', format: [w, h], orientation: h > w ? 'portrait' : 'landscape' });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h);
      var blob = pdf.output('blob');
      var pdfFile = new File([blob], 'receipts.pdf', { type: 'application/pdf' });
      if (navigator.share) {
        if (navigator.canShare({ files: [pdfFile] })) {
          try {
            await navigator.share({ files: [pdfFile], title: 'Lottery Receipts' });
            return;
          } catch (e) {
            if (e.name === 'AbortError') return;
          }
        }
        var imgBlob = await new Promise(function(resolve) { canvas.toBlob(resolve, 'image/png'); });
        var imgFile = new File([imgBlob], 'receipts.png', { type: 'image/png' });
        if (navigator.canShare({ files: [imgFile] })) {
          try {
            await navigator.share({ files: [imgFile], title: 'Lottery Receipts' });
            return;
          } catch (e) {
            if (e.name === 'AbortError') return;
          }
        }
        try {
          await navigator.share({ text: ALL_RECEIPT_TEXT, title: 'Lottery Receipts' });
          return;
        } catch (e) {
          if (e.name === 'AbortError') return;
        }
      }
      window.open('https://wa.me/?text=' + encodeURIComponent(ALL_RECEIPT_TEXT), '_blank');
    } catch (e) {
      allActions.forEach(function(el) { el.style.display = ''; });
      alert('Could not generate PDF. Try Print instead.');
    }
  }
<\/script>`;

  let combinedHtml = `<!doctype html><html>${headMatch?.[0] ?? '<head></head>'}<body>${combinedBody}</body></html>`;
  combinedHtml = combinedHtml.replace(/onclick="shareReceipt\(\)"/g, 'onclick="shareAll()"');
  combinedHtml = combinedHtml.replace('</body>', shareAllScript + '</body>');

  const blob = new Blob([combinedHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  if (!win) return false;
  return true;
};

export const openStoredReceiptWindow = async (receiptUrl: string): Promise<void> => {
  try {
    const response = await fetch(receiptUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();

    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    const popup = window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    if (!popup) {
      alert('Popup blocked. Please allow popups for this site.');
      return;
    }
  } catch (err) {
    console.error('Failed to open stored receipt:', err);
    window.open(receiptUrl, '_blank');
  }
};