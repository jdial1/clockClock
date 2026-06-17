const PERF_METRICS = [
  { label: 'FPS', key: 'fps', fmt: (n) => String(Math.round(n)) },
  { label: 'Frame ms', key: 'frameAvg', fmt: (n) => n.toFixed(1) },
  { label: 'Recalc/s', key: 'recalc' },
  { label: 'Hands/s', key: 'hands' },
  { label: 'Memory', key: 'memory' },
  { label: 'Jank %', key: 'jankPercent', fmt: (n) => n.toFixed(1) + '%' },
  { label: 'Data', key: 'dataObj' }
];

const fmtCompact = (n) => {
  n = Math.round(n);
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    const rounded = k >= 100 ? Math.round(k) : Math.round(k * 10) / 10;
    return (rounded % 1 === 0 ? String(rounded | 0) : String(rounded)) + 'k';
  }
  if (n < 1_000_000_000) {
    const m = n / 1_000_000;
    const rounded = m >= 100 ? Math.round(m) : Math.round(m * 10) / 10;
    return (rounded % 1 === 0 ? String(rounded | 0) : String(rounded)) + 'm';
  }
  const b = n / 1_000_000_000;
  const rounded = b >= 100 ? Math.round(b) : Math.round(b * 10) / 10;
  return (rounded % 1 === 0 ? String(rounded | 0) : String(rounded)) + 'b';
};

const perfStatsEl = document.getElementById('perf-stats');
const perfGridEl = perfStatsEl.querySelector('.perf-stats-grid');
const metricEls = {};
const perfStatEls = [];

PERF_METRICS.forEach((m) => {
  const label = document.createElement('span');
  label.className = 'perf-stats-label';
  label.textContent = m.label;
  const text = document.createElement('span');
  text.className = `perf-stats-val perf-${m.key}-avg`;
  const canvas = document.createElement('canvas');
  canvas.className = 'perf-spark';
  perfGridEl.append(label, text, canvas);
  metricEls[m.key] = { text, canvas, ctx: canvas.getContext('2d'), fmt: m.fmt || fmtCompact };
  perfStatEls.push(text);
});

const timeLabel = document.createElement('span');
timeLabel.className = 'perf-stats-label';
timeLabel.textContent = 'Time';
const perfRealtimeEl = document.createElement('span');
perfRealtimeEl.id = 'perf-realtime';
perfRealtimeEl.className = 'perf-stats-val perf-stats-wide';
const tzLabel = document.createElement('span');
tzLabel.className = 'perf-stats-label';
tzLabel.textContent = 'TZ';
const perfTimezoneEl = document.createElement('span');
perfTimezoneEl.id = 'perf-timezone';
perfTimezoneEl.className = 'perf-stats-val perf-stats-wide';
perfGridEl.append(timeLabel, perfRealtimeEl, tzLabel, perfTimezoneEl);
perfStatEls.push(perfRealtimeEl, perfTimezoneEl);

const PERF_WINDOW_MS = 5 * 60 * 1000;
const perfHistory = [];
const PERF_FRAME_TIMES_SIZE = 18000;
const perfFrameTimes = new Float32Array(PERF_FRAME_TIMES_SIZE);
let perfFrameTimesIdx = 0;
let perfFrameTimesCount = 0;
let perfStatsVisible = false;
let perfFrameCount = 0;
let perfRecalcSum = 0;
let perfHandsSum = 0;
let perfLastSample = 0;
let perfLastFrameStart = 0;
let perfMaxFrameTimeThisSample = 0;
let perfSumFrameTimeThisSample = 0;
const perfFrameTimesThisSecond = [];

const percentile = (sorted, p) => {
  const n = sorted.length;
  if (n === 0) return 0;
  if (n === 1) return sorted[0];
  const idx = (p / 100) * (n - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
};

const summarize = (key) => {
  const values = perfHistory.map((s) => s[key]);
  if (!values.length) return { p10: 0, avg: 0, p90: 0 };
  const sorted = values.slice().sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const out = [percentile(sorted, 10), sum / values.length, percentile(sorted, 90)].sort((a, b) => a - b);
  return { p10: out[0], avg: out[1], p90: out[2] };
};

const sampleMemoryBytes = () => {
  const mem = performance.memory;
  return mem ? mem.usedJSHeapSize : 0;
};

const estimateDataObjectBytes = () => {
  let bytes = clocksCache.length * 384 + perfHistory.length * 40;
  bytes += geometryBuffer.byteLength + colorBuffer.byteLength;
  bytes += globalGridBuffer.byteLength + gridFlags.byteLength;
  bytes += bucketArrayPool.length * 64;
  for (let i = 0; i < bucketArrayPool.length; i++) bytes += bucketArrayPool[i].length * 8;
  if (typeof fishCellPool !== 'undefined') bytes += fishCellPool.length * 48;
  if (typeof fishGrid !== 'undefined') bytes += GRID_COLS * GRID_ROWS * 16;
  if (typeof bubbles !== 'undefined') bytes += bubbles.length * 40;
  if (typeof matrixDrops !== 'undefined') bytes += matrixDrops.length * 40;
  return bytes;
};

const drawSparkline = (meta, key, stats) => {
  const { canvas, ctx } = meta;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w === 0 || h === 0 || perfHistory.length < 2) return;
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  ctx.clearRect(0, 0, w, h);
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < perfHistory.length; i++) {
    const v = perfHistory[i][key] || 0;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (stats) {
    if (stats.p10 < min) min = stats.p10;
    if (stats.p90 > max) max = stats.p90;
  }
  const range = max - min || 1;
  const pad = h * 0.15;
  const drawH = h - pad * 2;
  const getY = (val) => h - pad - ((val - min) / range) * drawH;
  if (stats) {
    ctx.lineWidth = 1.5;
    const bands = [
      ['rgba(255, 60, 60, 0.45)', stats.p10, [2, 4]],
      ['rgba(255, 255, 0, 0.45)', stats.avg, [4, 4]],
      ['rgba(0, 255, 128, 0.45)', stats.p90, [2, 4]]
    ];
    for (const [color, val, dash] of bands) {
      ctx.strokeStyle = color;
      ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.moveTo(0, getY(val));
      ctx.lineTo(w, getY(val));
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 2;
  for (let i = 0; i < perfHistory.length; i++) {
    const x = (i / (perfHistory.length - 1)) * w;
    const y = getY(perfHistory[i][key] || 0);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
};

const flushPerfSample = (sampleNow, fps, avgFrameTime, jankPercent, elapsed) => {
  const sample = {
    t: sampleNow,
    fps,
    frameAvg: avgFrameTime,
    recalc: Math.round(perfRecalcSum * 1000 / elapsed),
    hands: Math.round(perfHandsSum * 1000 / elapsed),
    memory: sampleMemoryBytes(),
    dataObj: estimateDataObjectBytes(),
    jankPercent
  };

  perfHistory.push(sample);
  const cutoff = sampleNow - PERF_WINDOW_MS;
  while (perfHistory.length && perfHistory[0].t < cutoff) perfHistory.shift();

  let fpsAvg = summarize('fps').avg;
  if (perfFrameTimesCount > 0) {
    const sortedDt = perfFrameTimes.subarray(0, perfFrameTimesCount).slice().sort();
    const p99 = percentile(sortedDt, 99);
    if (p99 > 0) fpsAvg = [1000 / p99, fpsAvg, summarize('fps').p90].sort((a, b) => a - b)[1];
  }

  PERF_METRICS.forEach((m) => {
    const meta = metricEls[m.key];
    const stats = summarize(m.key);
    const display = m.key === 'fps'
      ? Math.round([fpsAvg, stats.avg, stats.p90].sort((a, b) => a - b)[1])
      : stats.avg;
    meta.text.textContent = meta.fmt(display);
    drawSparkline(meta, m.key, stats);
  });

  perfRealtimeEl.textContent = new Date().toLocaleTimeString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3
  });
  perfTimezoneEl.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;
};

const processPerfFrame = (frameStart, frameRecalc, frameHands) => {
  if (!perfStatsVisible) return;
  perfRecalcSum += frameRecalc;
  perfHandsSum += frameHands;
  perfFrameCount++;
  const frameEnd = performance.now();
  const cpuDt = frameEnd - frameStart;
  if (cpuDt > perfMaxFrameTimeThisSample) perfMaxFrameTimeThisSample = cpuDt;
  perfSumFrameTimeThisSample += cpuDt;

  if (perfLastFrameStart > 0) {
    const frameDt = frameStart - perfLastFrameStart;
    if (frameDt > 0) {
      perfFrameTimes[perfFrameTimesIdx] = frameDt;
      perfFrameTimesIdx = (perfFrameTimesIdx + 1) % PERF_FRAME_TIMES_SIZE;
      if (perfFrameTimesCount < PERF_FRAME_TIMES_SIZE) perfFrameTimesCount++;
      perfFrameTimesThisSecond.push(frameDt);
    }
  }
  perfLastFrameStart = frameStart;

  const elapsed = frameEnd - perfLastSample;
  if (elapsed < 1000) return;

  let jankPercent = 0;
  if (perfFrameTimesThisSecond.length > 0) {
    const sortedDt = perfFrameTimesThisSecond.slice().sort((a, b) => a - b);
    const threshold = Math.max(16, sortedDt[Math.floor(sortedDt.length / 2)] * 1.5);
    jankPercent = perfFrameTimesThisSecond.filter((dt) => dt > threshold).length / perfFrameTimesThisSecond.length * 100;
  }

  flushPerfSample(
    frameEnd,
    Math.round(perfFrameCount * 1000 / elapsed),
    perfSumFrameTimeThisSample / perfFrameCount,
    jankPercent,
    elapsed
  );

  perfFrameCount = 0;
  perfRecalcSum = 0;
  perfHandsSum = 0;
  perfMaxFrameTimeThisSample = 0;
  perfSumFrameTimeThisSample = 0;
  perfFrameTimesThisSecond.length = 0;
  perfLastSample = frameEnd;
};

const resetPerfSample = () => {
  perfFrameCount = 0;
  perfRecalcSum = 0;
  perfHandsSum = 0;
  perfMaxFrameTimeThisSample = 0;
  perfSumFrameTimeThisSample = 0;
  perfFrameTimesThisSecond.length = 0;
  perfLastSample = performance.now();
  perfLastFrameStart = perfLastSample;
  perfHistory.length = 0;
  perfFrameTimesIdx = 0;
  perfFrameTimesCount = 0;
  perfStatEls.forEach((el) => { el.textContent = '—'; });
  PERF_METRICS.forEach((m) => {
    const { canvas, ctx } = metricEls[m.key];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
};

const togglePerfStats = () => {
  perfStatsVisible = !perfStatsVisible;
  perfStatsEl.classList.toggle('visible', perfStatsVisible);
  perfStatsEl.setAttribute('aria-hidden', perfStatsVisible ? 'false' : 'true');
  if (perfStatsVisible) resetPerfSample();
};
