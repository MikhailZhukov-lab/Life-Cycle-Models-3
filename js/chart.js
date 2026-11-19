/* Canvas-графіки: межі визначаються за всіма скінченними точками. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SlarCharts = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  function range(values, log = false) {
    const clean = values.filter(Number.isFinite).filter(v => !log || v >= 0).map(v => log ? Math.log10(Math.max(v, 1e-300)) : v);
    let min = clean.length ? Infinity : 0, max = clean.length ? -Infinity : 1;
    for (const value of clean) { if (value < min) min = value; if (value > max) max = value; }
    const pad = min === max ? Math.max(Math.abs(min) * .05, 1) : (max - min) * .07;
    return [min - pad, max + pad];
  }
  class Chart {
    constructor(canvas) { this.canvas = canvas; }
    draw(series, { log = false, xLabel = 'i', yLabel = 'xᵢ' } = {}) {
      const el = this.canvas, width = el.getBoundingClientRect().width || 500, height = el.getBoundingClientRect().height || 280;
      const ratio = window.devicePixelRatio || 1; el.width = Math.round(width * ratio); el.height = Math.round(height * ratio);
      const ctx = el.getContext('2d'); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = '#fffefa'; ctx.fillRect(0, 0, width, height);
      const left = 64, right = width - 20, top = 46, bottom = height - 42;
      const points = series.flatMap(s => s.points).filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]) && (!log || p[1] >= 0));
      const [xmin, xmax] = range(points.map(p => p[0])); const [ymin, ymax] = range(points.map(p => p[1]), log);
      this.bounds = { xmin, xmax, ymin, ymax, log };
      const X = x => left + (x - xmin) / (xmax - xmin) * (right - left);
      const Y = y => bottom - ((log ? Math.log10(Math.max(y, 1e-300)) : y) - ymin) / (ymax - ymin) * (bottom - top);
      ctx.font = '10px Segoe UI, sans-serif'; ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const x = xmin + (xmax - xmin) * i / 4, y = ymin + (ymax - ymin) * i / 4;
        const py = bottom - (bottom - top) * i / 4, px = X(x);
        ctx.strokeStyle = '#e9ece3'; ctx.beginPath(); ctx.moveTo(left, py); ctx.lineTo(right, py); ctx.moveTo(px, top); ctx.lineTo(px, bottom); ctx.stroke();
        ctx.fillStyle = '#8a9187'; ctx.textAlign = 'right'; ctx.fillText(log ? `10^${y.toFixed(1)}` : y.toPrecision(3), left - 8, py + 3);
        ctx.textAlign = 'center'; ctx.fillText(x.toFixed(xmax - xmin > 8 ? 0 : 1), px, bottom + 16);
      }
      ctx.fillStyle = '#6d776b'; ctx.textAlign = 'center'; ctx.fillText(xLabel, (left + right) / 2, height - 8);
      ctx.save(); ctx.translate(13, (top + bottom) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(yLabel, 0, 0); ctx.restore();
      let legendX = 20;
      for (const s of series) {
        ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 1.6; ctx.setLineDash(s.dash || []);
        ctx.beginPath(); let started = false;
        for (const [x, y] of s.points) {
          if (!Number.isFinite(x) || !Number.isFinite(y) || (log && y < 0)) { started = false; continue; }
          if (!started) ctx.moveTo(X(x), Y(y)); else ctx.lineTo(X(x), Y(y)); started = true;
        }
        ctx.stroke();ctx.setLineDash([]);
        if (s.markers) {
          for (const [x,y] of s.points) if (Number.isFinite(x) && Number.isFinite(y)) {
            ctx.beginPath();ctx.arc(X(x),Y(y),s.markers,0,Math.PI*2);ctx.stroke();
          }
        }
        ctx.fillStyle = s.color; ctx.fillRect(legendX, 18, 12, 2); ctx.fillStyle = '#626d61'; ctx.textAlign = 'left';
        ctx.fillText(s.name, legendX + 17, 22); legendX += ctx.measureText(s.name).width + 34;
      }
      if (!points.length) { ctx.textAlign = 'center'; ctx.fillText('Немає скінченних даних для графіка', width / 2, height / 2); }
    }
  }
  return { Chart, range };
});
