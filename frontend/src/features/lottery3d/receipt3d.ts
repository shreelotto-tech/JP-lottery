import type { BetListEntry, BetType3D, Mode3D } from './types';
import { getDisplayNumber, completePairNumber } from './utils';

export function generate3DReceiptHtml(params: {
  bets: BetListEntry[];
  modes: Mode3D[];
  desk: string;
  drawDate: string;
  drawTime: string;
  barcode: string;
  username: string;
}): string {
  const { bets, desk, drawDate, drawTime, barcode } = params;
  const qty = bets.length;
  const totalPoints = bets.reduce((s, b) => s + b.amount, 0);
  const now = new Date();
  const timeStr = now.toLocaleString('en-GB', { hour12: false });
  const barcodeValue = barcode.slice(-10);

  type Entry = { type: BetType3D; mode: Mode3D; displayNum: string; amount: number };
  const entries: Entry[] = [];
  for (const bet of bets) {
    const effectiveNum = bet.pairDigits ? completePairNumber(bet.pairDigits, bet.betType) : bet.number;
    entries.push({
      type: bet.betType,
      mode: bet.mode,
      displayNum: getDisplayNumber(effectiveNum, bet.betType),
      amount: bet.amount,
    });
  }

  const tableRows: string[] = [];
  for (let i = 0; i < entries.length; i += 3) {
    const chunk = entries.slice(i, i + 3);
    while (chunk.length < 3) chunk.push({ type: 'STR', mode: 'A', displayNum: '', amount: 0 });
    const cells = chunk.map((e) =>
      e.displayNum
        ? `<td class="rt">${e.type}</td><td class="rn">${e.mode}-${e.displayNum}</td><td class="rp">${e.amount}</td>`
        : `<td class="rt"></td><td class="rn"></td><td class="rp"></td>`
    ).join('');
    tableRows.push(`<tr>${cells}</tr>`);
  }

  const usedModes = new Set(bets.map((b) => b.mode));
  const modesCount = usedModes.size;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Shree Lotto</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;background:#fff;color:#111}
.receipt{width:360px;margin:0 auto;padding:10px}
.title{font-size:22px;font-weight:900}
.sub{font-size:13px;font-weight:700}
.line{border-top:1px dotted #555;margin:5px 0}
.meta{font-size:13px;font-weight:700;line-height:1.6}
.summary{font-size:13px;font-weight:700}
.bets{width:100%;border-collapse:collapse;font-family:'Courier New',monospace;font-size:15px;table-layout:fixed}
.bets .hd{font-size:14px;font-weight:700;color:#777;border-bottom:1px dotted #aaa;padding:1px 2px}
.bets .rt{width:32px;font-weight:900;font-family:Arial,sans-serif;padding:1px 2px}
.bets .rn{width:52px;padding:1px 2px;font-weight:900;font-family:Arial,sans-serif}
.bets .rp{width:24px;padding:1px 2px}
.barcode-wrap{text-align:center;margin-top:8px}
.barcode{height:50px;width:200px;margin:0 auto 4px;background:repeating-linear-gradient(90deg,#000 0px,#000 2px,#fff 2px,#fff 4px,#000 4px,#000 5px,#fff 5px,#fff 7px)}
.barcode-num{letter-spacing:2px;font-size:16px;font-weight:700}
.actions{margin-top:10px;display:flex;gap:10px;align-items:center}
.actions button{padding:4px 14px;font-size:14px;cursor:pointer}
.play-again{font-size:14px;font-weight:700;color:#6600cc;text-decoration:underline;cursor:pointer;background:none;border:none}
@media print{.actions{display:none}}
</style>
</head>
<body>
<div class="receipt">
  <div class="title">Shree Lotto 3D</div>
  <div class="sub">(Fun Coupon valid for 10 Days)</div>
  <div class="sub">Free Coupon for Fun Only, ${modesCount} Series</div>
  <div class="meta" style="margin-top:4px">
    <div>Draw:- ${drawDate} ${drawTime}</div>
    <div>Desk: ${desk}</div>
  </div>
  <div class="line"></div>
  <div class="summary">Qty:${qty}, Point: ${totalPoints}</div>
  <div class="line"></div>
  <table class="bets">
    <tr>
      <th class="hd rt">Type</th><th class="hd rn">Num.</th><th class="hd rp">Pt.</th>
      <th class="hd rt">Type</th><th class="hd rn">Num.</th><th class="hd rp">Pt.</th>
      <th class="hd rt">Type</th><th class="hd rn">Num.</th><th class="hd rp">Pt.</th>
    </tr>
    ${tableRows.join('')}
  </table>
  <div class="line"></div>
  <div class="meta">
    <div>Time: ${timeStr}</div>
    <div>Serial Id: ${barcode}</div>
  </div>
  <div class="barcode-wrap">
    <div class="barcode"></div>
    <div class="barcode-num">${barcodeValue}</div>
  </div>
  <div class="line"></div>
  <div class="actions">
    <button onclick="window.print()">Print</button>
    <button onclick="shareAsPdf()">Share</button>
    <button class="play-again" onclick="if(window.opener&&!window.opener.closed){window.opener.focus();window.close();}else{window.location.href='/3d';}">Click To Play Again</button>
  </div>
</div>
<script>
  async function shareAsPdf() {
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
          await navigator.share({ title: 'Lottery Receipt' });
          return;
        } catch (e) {
          if (e.name === 'AbortError') return;
        }
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(pdfFile);
      a.download = 'receipt.pdf';
      a.click();
    } catch (e) {
      actions.style.display = '';
      alert('Could not generate PDF. Try Print instead.');
    }
  }
</script>
</body>
</html>`;
}
