/**
 * NexusCrypto AI - Interactive Canvas Chart Engine
 * Renders Candlestick / Gradient Line charts with EMA overlay and crosshairs.
 */

export class ChartEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!canvasId || !this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.candles = [];
    this.symbol = 'BTC';
    this.chartMode = 'candles'; // 'candles' or 'line'
    this.hoverIndex = -1;
    this.overlayLevels = null; // { entryLow, entryHigh, takeProfit1, takeProfit2, stopLoss }

    this.initListeners();
  }

  initListeners() {
    if (!this.canvas) return;

    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.draw();
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (this.candles.length > 0) {
        const step = this.canvas.width / this.candles.length;
        this.hoverIndex = Math.min(this.candles.length - 1, Math.max(0, Math.floor(x / step)));
        this.draw();
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoverIndex = -1;
      this.draw();
    });
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    this.canvas.width = parent.clientWidth || 320;
    this.canvas.height = parent.clientHeight || 180;
  }

  updateData(candles, symbol, mode = null, overlayLevels = null) {
    this.candles = candles || [];
    this.symbol = symbol || this.symbol;
    if (mode) this.chartMode = mode;
    if (overlayLevels !== null) this.overlayLevels = overlayLevels;
    this.resizeCanvas();
    this.draw();
  }

  draw() {
    if (!this.ctx || !this.canvas || this.candles.length === 0) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    const padding = { top: 20, bottom: 25, left: 10, right: 55 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    // Find min and max
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    this.candles.forEach(c => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    });

    // Add padding to price range
    const priceRange = maxPrice - minPrice || 1;
    const yMin = minPrice - priceRange * 0.05;
    const yMax = maxPrice + priceRange * 0.05;
    const fullRange = yMax - yMin;

    const getY = (price) => {
      return padding.top + chartH - ((price - yMin) / fullRange) * chartH;
    };

    // Draw Gridlines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      // Price labels on right
      const priceAtY = yMax - (i / 4) * fullRange;
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(priceAtY.toFixed(priceAtY < 1 ? 4 : 1), w - padding.right + 5, y + 3);
    }

    const candleCount = this.candles.length;
    const candleWidth = Math.max(2, (chartW / candleCount) * 0.65);
    const step = chartW / candleCount;

    if (this.chartMode === 'candles') {
      // Draw Candlesticks
      this.candles.forEach((c, idx) => {
        const x = padding.left + idx * step + step / 2;
        const isBull = c.close >= c.open;
        const color = isBull ? '#00ff9d' : '#ff4d6d';

        const openY = getY(c.open);
        const closeY = getY(c.close);
        const highY = getY(c.high);
        const lowY = getY(c.low);

        // Wick
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Body
        ctx.fillStyle = color;
        const bodyY = Math.min(openY, closeY);
        const bodyH = Math.max(2, Math.abs(closeY - openY));
        ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyH);
      });
    } else {
      // Line + Gradient Area Chart
      const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
      gradient.addColorStop(0, 'rgba(0, 229, 255, 0.35)');
      gradient.addColorStop(1, 'rgba(0, 229, 255, 0.0)');

      ctx.beginPath();
      this.candles.forEach((c, idx) => {
        const x = padding.left + idx * step + step / 2;
        const y = getY(c.close);
        if (idx === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      // Area fill
      const lastX = padding.left + (candleCount - 1) * step + step / 2;
      const firstX = padding.left + step / 2;
      ctx.lineTo(lastX, padding.top + chartH);
      ctx.lineTo(firstX, padding.top + chartH);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Stroke Line
      ctx.beginPath();
      this.candles.forEach((c, idx) => {
        const x = padding.left + idx * step + step / 2;
        const y = getY(c.close);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw AI Setup Overlay Lines if present
    if (this.overlayLevels) {
      const { entryLow, entryHigh, takeProfit1, takeProfit2, stopLoss } = this.overlayLevels;

      // Shaded Entry Zone
      if (entryLow && entryHigh) {
        const yLow = getY(entryLow);
        const yHigh = getY(entryHigh);
        ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
        ctx.fillRect(padding.left, Math.min(yLow, yHigh), chartW, Math.abs(yLow - yHigh) || 4);

        ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(padding.left, yHigh);
        ctx.lineTo(w - padding.right, yHigh);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#00e5ff';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText(`ENTRY: $${entryLow}`, w - padding.right + 4, yHigh + 3);
      }

      // Take Profit 1 & 2
      if (takeProfit1) {
        const yTp1 = getY(takeProfit1);
        ctx.strokeStyle = '#00ff9d';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(padding.left, yTp1);
        ctx.lineTo(w - padding.right, yTp1);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#00ff9d';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText(`TP1: $${takeProfit1}`, w - padding.right + 4, yTp1 + 3);
      }

      if (takeProfit2) {
        const yTp2 = getY(takeProfit2);
        ctx.strokeStyle = 'rgba(0, 255, 157, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(padding.left, yTp2);
        ctx.lineTo(w - padding.right, yTp2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(0, 255, 157, 0.85)';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText(`TP2: $${takeProfit2}`, w - padding.right + 4, yTp2 + 3);
      }

      // Stop Loss
      if (stopLoss) {
        const ySl = getY(stopLoss);
        ctx.strokeStyle = '#ff3366';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(padding.left, ySl);
        ctx.lineTo(w - padding.right, ySl);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ff3366';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText(`SL: $${stopLoss}`, w - padding.right + 4, ySl + 3);
      }
    }

    // Hover details
    if (this.hoverIndex >= 0 && this.hoverIndex < this.candles.length) {
      const c = this.candles[this.hoverIndex];
      const x = padding.left + this.hoverIndex * step + step / 2;
      const y = getY(c.close);

      // Vertical crosshair
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Highlight dot
      ctx.fillStyle = '#00ff9d';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Tooltip in corner
      ctx.fillStyle = 'rgba(10, 14, 23, 0.85)';
      ctx.strokeStyle = '#00ff9d';
      ctx.lineWidth = 1;
      ctx.fillRect(10, 5, 150, 20);
      ctx.strokeRect(10, 5, 150, 20);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`Close: $${c.close.toLocaleString()}`, 15, 18);
    }
  }
}
