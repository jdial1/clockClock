const ARCADE_HEX = [
  '#1A1A24', '#2D283E', '#4B4263', '#7A6E94', '#E0D8EE',
  '#FF0055', '#FF00FF', '#D02090', '#9400D3', '#7871FB',
  '#0044FF', '#00A2FF', '#00FFFF', '#00FFCC', '#00FF00',
  '#7FFF00', '#FFFF00', '#FFD700', '#FF8C00', '#FF3300'
];
const ARCADE_HAND_HEX = ARCADE_HEX.slice(5);

const hexToHsl = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
};

const vibrantHandHsl = (h, s, l) => {
  let sat = s < 12 ? 90 : s + 30;
  sat = Math.min(100, Math.max(82, sat));
  let lit = l < 40 ? l + 24 : l > 74 ? l - 14 : l + 6;
  lit = Math.min(64, Math.max(52, lit));
  return [h, sat, lit];
};

const ARCADE_HAND_PALETTE = ARCADE_HAND_HEX.map((hex) => vibrantHandHsl(...hexToHsl(hex)));

const arcadeIndex = (track, angle) => {
  const t = track !== undefined
    ? (track - HAND_MIN) / HAND_SPAN
    : mod(angle, 360) / 360;
  return Math.min(ARCADE_HAND_PALETTE.length - 1, Math.max(0, Math.floor(t * ARCADE_HAND_PALETTE.length)));
};

const arcadeHandHsl = (track, angle) => ARCADE_HAND_PALETTE[arcadeIndex(track, angle)];

const clampTrack = (nextTrack) => Math.max(HAND_MIN, Math.min(HAND_MAX, nextTrack));

const biasedRotationStep = (aA, aB, preferCw) => {
  const d = mod(aB - aA, 360);
  if (d === 0) return 0;
  return preferCw ? d : d - 360;
};

const biasedLerp = (aA, aB, f, preferCw) => {
  const step = biasedRotationStep(aA, aB, preferCw);
  return step === 0 ? aA : aA + step * f;
};

const handTransitionRotation = (aA, aB, steppedT, preferCw) => {
  const step = biasedRotationStep(aA, aB, preferCw);
  if (step === 0) return 0;
  const t = steppedT <= 0 ? 0 : steppedT >= 1 ? 1 : steppedT;
  return step * t;
};

const applyClockTrack = (trackSum, trackBase, hA, hB, mA, mB, steppedT, windDir) => {
  let dir = windDir === undefined ? 1 : windDir;
  const preferCw = dir === 1;
  const sum = trackSum === undefined ? 0 : trackSum;
  const base = steppedT <= 0 ? sum : (trackBase === undefined ? sum : trackBase);
  if (steppedT >= 1) {
    const settled = clampTrack(
      base + handTransitionRotation(hA, hB, 1, preferCw) + handTransitionRotation(mA, mB, 1, preferCw)
    );
    if (settled >= HAND_MAX) dir = -1;
    else if (settled <= HAND_MIN) dir = 1;
    return { track: settled, trackBase: settled, windDir: dir };
  }
  const delta = handTransitionRotation(hA, hB, steppedT, preferCw) + handTransitionRotation(mA, mB, steppedT, preferCw);
  return { track: clampTrack(base + delta), trackBase: base, windDir: dir };
};

const quantizeHue = (h) => mod(Math.round(h / 2) * 2, 360);
const quantizeByte = (n) => Math.round(n / 4) * 4 & 0xff;
const packColor = (h, s, l) => (((quantizeHue(h) / 2) << 16) | (quantizeByte(s) << 8) | quantizeByte(l)) >>> 0;
const COLOR_KEY_WHITE = 0xffffff;
const MAX_SEGS = GRID_COLS * GRID_ROWS * 4;
const TETRIS_ARM_ANGLES = [270, 0, 90, 180];
const geometryBuffer = new Float32Array(MAX_SEGS * 4);
const colorBuffer = new Uint32Array(MAX_SEGS);
const bucketArrayPool = [];
let totalSegs = 0;

const strokeStyleForKey = (key) => {
  if (key === COLOR_KEY_WHITE) return 'rgba(255, 255, 255, 0.8)';
  const h = ((key >> 16) & 0xff) * 2;
  const s = (key >> 8) & 0xff;
  const l = key & 0xff;
  return `hsl(${h}, ${s}%, ${l}%)`;
};

const queueHandSegment = (key, cx, cy, ex, ey) => {
  const i = totalSegs++;
  const idx = i * 4;
  geometryBuffer[idx] = cx;
  geometryBuffer[idx + 1] = cy;
  geometryBuffer[idx + 2] = ex;
  geometryBuffer[idx + 3] = ey;
  colorBuffer[i] = key;
};

const resetGeometry = () => { totalSegs = 0; };

const flushGeometryPipeline = (ctx, lineWidth) => {
  const buckets = new Map();
  for (let i = 0; i < totalSegs; i++) {
    const key = colorBuffer[i];
    let segs = buckets.get(key);
    if (!segs) {
      segs = bucketArrayPool.pop() || [];
      buckets.set(key, segs);
    }
    const idx = i * 4;
    segs.push(geometryBuffer[idx], geometryBuffer[idx + 1], geometryBuffer[idx + 2], geometryBuffer[idx + 3]);
  }
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [key, segs] of buckets) {
    ctx.strokeStyle = strokeStyleForKey(key);
    ctx.beginPath();
    for (let j = 0; j < segs.length; j += 4) {
      ctx.moveTo(segs[j], segs[j + 1]);
      ctx.lineTo(segs[j + 2], segs[j + 3]);
    }
    ctx.stroke();
    segs.length = 0;
    bucketArrayPool.push(segs);
  }
  totalSegs = 0;
};

const addHandSeg = queueHandSegment;
const resetHandBuckets = resetGeometry;

const mixHue = (base, target, blend) => base + ((target - base + 540) % 360 - 180) * blend;

const SIN_LUT = new Float32Array(3600);
const COS_LUT = new Float32Array(3600);
for (let i = 0; i < 3600; i++) {
  const rad = i * Math.PI / 1800;
  SIN_LUT[i] = Math.sin(rad);
  COS_LUT[i] = Math.cos(rad);
}
const trigIdx = (deg) => ((Math.round(deg * 10) % 3600) + 3600) % 3600;
const sinDeg = (deg) => SIN_LUT[trigIdx(deg)];
const cosDeg = (deg) => COS_LUT[trigIdx(deg)];

const easeOutBack = (x) => {
  const c1 = 1.2;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

const padDigitsFromEpoch = (out, epochSec) => {
  const secMod = epochSec % 60;
  const minMod = ((epochSec / 60) | 0) % 60;
  const hourMod = ((epochSec / 3600) | 0) % 24;
  out[0] = (hourMod / 10) | 0;
  out[1] = hourMod % 10;
  out[2] = (minMod / 10) | 0;
  out[3] = minMod % 10;
  out[4] = (secMod / 10) | 0;
  out[5] = secMod % 10;
};

const MODES = [
  { id: 'time', glow: 'rgba(255, 0, 255, 0.025)', url: 1 },
  { id: 'date', glow: 'rgba(255, 255, 255, 0.015)', url: 2, idle: () => dateIdle },
  { id: 'weather', glow: 'rgba(255, 255, 255, 0.015)', url: 3, idle: () => weatherIdle },
  { id: 'ridgeline', glow: 'rgba(0, 200, 200, 0.025)', url: 4, idle: () => ridgelineIdle, auto: true },
  { id: 'neon', glow: 'rgba(255, 0, 150, 0.025)', url: 5, idle: () => neonIdle, auto: true },
  { id: 'vortex', glow: 'rgba(120, 0, 255, 0.025)', url: 6, idle: () => vortexIdle, auto: true },
  { id: 'pulse', glow: 'rgba(100, 170, 255, 0.035)', url: 7, idle: () => pulseIdle, auto: true },
  { id: 'fish', glow: 'rgba(0, 120, 255, 0.025)', url: 8, idle: () => fishIdle, auto: true },
  { id: 'matrix', glow: 'rgba(0, 255, 50, 0.03)', url: 9, idle: () => matrixIdle, auto: true },
  { id: 'gravity', glow: 'rgba(180, 120, 40, 0.02)', url: 10, idle: () => gravityIdle, auto: true },
  { id: 'tetris', glow: 'rgba(255, 100, 200, 0.025)', url: 11, idle: () => tetrisIdle, auto: true },
  { id: 'snake', glow: 'rgba(0, 255, 80, 0.035)', url: 12, idle: () => snakeIdle, auto: true },
  { id: 'pong', glow: 'rgba(255, 220, 60, 0.03)', url: 13, idle: () => pongIdle, auto: true }
];

const glowThemes = Object.fromEntries(MODES.map((m) => [m.id, m.glow]));
const anims = Object.fromEntries(MODES.filter((m) => m.idle).map((m) => [m.id, m.idle()]));

const app = document.createElement('div');
app.className = 'app';
document.getElementById('root').appendChild(app);

const canvas = document.createElement('canvas');
app.appendChild(canvas);
const ctx = canvas.getContext('2d');

const clocksCache = [];
let clockSize = 0;
let gap = 0;
let gridWidth = 0;
let gridHeight = 0;
let faceSize = 0;
let dpr = 1;
let faceCanvas = null;
let gridBgCanvas = null;

let currentMode = 'auto';
let modeStartTime = 0;
let autoRotation = MODES.filter((m) => m.auto).map((m) => m.id);

const flagMatch = window.location.pathname.match(/\/([1-9]|10|11)\/?$/) ||
                  window.location.hash.match(/#([1-9]|10|11)\b/) ||
                  window.location.search.match(/\?([1-9]|10|11)\b/);
if (flagMatch) {
  const mode = MODES.find((m) => m.url === parseInt(flagMatch[1], 10));
  if (mode) {
    currentMode = mode.id;
    document.querySelector('.controls').style.display = 'none';
  }
}

const controlButtons = Array.from(document.querySelectorAll('.controls button'));
let lastPlayingMode = null;
let lastGlowMode = null;

const updateButtonStates = () => {
  controlButtons.forEach((b) => {
    const m = b.id.replace('btn-', '');
    b.classList.toggle('active', m === currentMode);
    if (m === 'auto' && currentMode !== 'auto') b.classList.add('excluded');
    else if (currentMode === 'auto' && m !== 'auto') b.classList.toggle('excluded', !autoRotation.includes(m));
    else b.classList.remove('excluded');
  });
};

controlButtons.forEach((btn) => {
  btn.addEventListener('click', (e) => {
    const clickedMode = e.target.id.replace('btn-', '');
    if (clickedMode === 'auto') {
      currentMode = currentMode === 'auto' ? 'time' : 'auto';
      modeStartTime = Date.now();
      updateButtonStates();
      return;
    }
    if (currentMode === 'auto') {
      autoRotation = autoRotation.includes(clickedMode)
        ? autoRotation.filter((m) => m !== clickedMode)
        : [...autoRotation, clickedMode];
      updateButtonStates();
      return;
    }
    currentMode = clickedMode;
    modeStartTime = Date.now();
    updateButtonStates();
  });
});

updateButtonStates();

const idleResult = { strength: 0, animType: null };
const dA = new Array(6);
const dB = new Array(6);
const frameData = {
  t: 0, neonCx1: 0, neonCy1: 0, neonCx2: 0, neonCy2: 0,
  dateT2: 0,
  vortexPrecessX: 0, vortexPrecessY: 0, vortexTimeEffect: 0, vortexSpreadTimeEffect: 0
};

let frozenSnap = null;
let frozenAngles = null;
let frozenCycle = -1;

const idleState = (ms) => {
  if (currentMode !== 'auto') {
    if (currentMode === 'time') return null;
    idleResult.strength = Math.min(1, (ms - modeStartTime) / IDLE_FADE);
    idleResult.animType = currentMode;
    return idleResult;
  }
  if (autoRotation.length === 0) return null;
  const pos = ms % CYCLE;
  if (pos >= RING_LENGTH) return null;
  const fadeIn = Math.min(1, pos / IDLE_FADE);
  const fadeOut = pos > RING_LENGTH - IDLE_FADE ? (RING_LENGTH - pos) / IDLE_FADE : 1;
  const animType = autoRotation[~~(ms / CYCLE) % autoRotation.length];
  if (animType === 'time') return null;
  idleResult.strength = Math.min(fadeIn, fadeOut);
  idleResult.animType = animType;
  return idleResult;
};

const captureFrozen = (ms) => {
  const tick = ms - (ms % 1000);
  const d = new Date(tick);
  const fakeEpoch = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  const secMod = d.getSeconds();
  padDigitsFromEpoch(dA, fakeEpoch);
  if (!frozenSnap) frozenSnap = new Array(clocksCache.length);
  for (let i = 0; i < clocksCache.length; i++) {
    timeAngles(clocksCache[i], dA, dA, secMod, secMod, 1, tick);
    frozenSnap[i] = clocksCache[i].timeOut;
  }
  return frozenSnap;
};

const resolveCellLayout = (ix, iy, isRing) => {
  const region = REGIONS.find((r) => ix >= r.x0 && ix <= r.x1);
  if (!region) return { digitIdx: ix < 0 ? 0 : 5, isColon: false };
  if (region.colon) {
    return {
      digitIdx: ix < 0 ? 0 : 5,
      isColon: true,
      colonSlot: isRing ? undefined : iy,
      colonFill: !isRing && !COLON_DOTS.has(iy)
    };
  }
  return {
    digitIdx: region.digit,
    clockIdx: isRing ? undefined : iy * 4 + (ix - region.x0),
    isColon: false
  };
};

const buildFaceCanvas = () => {
  const pad = 10;
  faceSize = Math.round(clockSize + pad * 2);
  const prevFace = faceCanvas;
  faceCanvas = document.createElement('canvas');
  faceCanvas.width = faceSize * dpr;
  faceCanvas.height = faceSize * dpr;
  if (prevFace) { prevFace.width = 0; prevFace.height = 0; }
  const fctx = faceCanvas.getContext('2d');
  fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cx = faceSize / 2;
  const cy = faceSize / 2;
  const r = clockSize / 2;
  const grad = fctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  grad.addColorStop(0.1, BG.face);
  grad.addColorStop(1, BG.faceHi);
  fctx.save();
  fctx.shadowColor = '#0b0806';
  fctx.shadowBlur = 6;
  fctx.shadowOffsetX = -2;
  fctx.shadowOffsetY = 2;
  fctx.beginPath();
  fctx.arc(cx, cy, r, 0, Math.PI * 2);
  fctx.fillStyle = BG.face;
  fctx.fill();
  fctx.restore();
  fctx.save();
  fctx.shadowColor = '#231a14';
  fctx.shadowBlur = 6;
  fctx.shadowOffsetX = 2;
  fctx.shadowOffsetY = -2;
  fctx.beginPath();
  fctx.arc(cx, cy, r, 0, Math.PI * 2);
  fctx.fillStyle = BG.face;
  fctx.fill();
  fctx.restore();
  fctx.beginPath();
  fctx.arc(cx, cy, r, 0, Math.PI * 2);
  fctx.fillStyle = grad;
  fctx.fill();
  fctx.strokeStyle = '#221c18';
  fctx.lineWidth = 2;
  fctx.stroke();
  fctx.beginPath();
  fctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
  fctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
  fctx.lineWidth = 1;
  fctx.stroke();
  fctx.beginPath();
  fctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
  fctx.strokeStyle = 'rgba(255, 255, 255, 0.008)';
  fctx.stroke();
  fctx.beginPath();
  fctx.arc(cx, cy, r, 0, Math.PI * 2);
  fctx.lineWidth = 1.5;
  fctx.strokeStyle = BG.rim;
  fctx.stroke();
  fctx.strokeStyle = BG.tick;
  fctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const angle = (i * 30 * Math.PI) / 180;
    const x1 = cx + (r - 4) * Math.cos(angle);
    const y1 = cy + (r - 4) * Math.sin(angle);
    const x2 = cx + (r - 1) * Math.cos(angle);
    const y2 = cy + (r - 1) * Math.sin(angle);
    fctx.beginPath();
    fctx.moveTo(x1, y1);
    fctx.lineTo(x2, y2);
    fctx.stroke();
  }
};

const preRenderGridBackground = () => {
  const prevGridBg = gridBgCanvas;
  gridBgCanvas = document.createElement('canvas');
  gridBgCanvas.width = canvas.width;
  gridBgCanvas.height = canvas.height;
  if (prevGridBg) { prevGridBg.width = 0; prevGridBg.height = 0; }
  const bgCtx = gridBgCanvas.getContext('2d');
  bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  bgCtx.fillStyle = BG.deep;
  bgCtx.fillRect(0, 0, gridWidth, gridHeight);
  const faceOffset = faceSize / 2;
  for (let i = 0; i < clocksCache.length; i++) {
    const c = clocksCache[i];
    bgCtx.drawImage(faceCanvas, c.cx - faceOffset, c.cy - faceOffset, faceSize, faceSize);
  }
};

const setupGrid = () => {
  dpr = window.devicePixelRatio || 1;
  clockSize = window.innerWidth * 0.03;
  gap = clockSize * 0.05;
  gridWidth = GRID_COLS * clockSize + (GRID_COLS - 1) * gap;
  gridHeight = GRID_ROWS * clockSize + (GRID_ROWS - 1) * gap;
  canvas.width = gridWidth * dpr;
  canvas.height = gridHeight * dpr;
  canvas.style.width = `${gridWidth}px`;
  canvas.style.height = `${gridHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  app.style.setProperty('--clock-size', `${clockSize}px`);
  for (let i = 0; i < clocksCache.length; i++) {
    const c = clocksCache[i];
    c.cx = Math.round(c.x * (clockSize + gap) + clockSize / 2);
    c.cy = Math.round(c.y * (clockSize + gap) + clockSize / 2);
    c.drawKeyH = undefined;
    c.drawKeyArms = undefined;
    c.drawKeyCustomCount = undefined;
  }
  buildFaceCanvas();
  preRenderGridBackground();
};

for (let y = 0; y < GRID_ROWS; y++) {
  for (let x = 0; x < GRID_COLS; x++) {
    const isRing = x === 0 || x === 27 || y === 0 || y === 7;
    const dx = x - 13.5;
    const dy = y - 3.5;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    clocksCache.push({
      x, y, cx: 0, cy: 0, isRing, dx, dy,
      hexDist: Math.max(Math.abs(dx), Math.abs(dx * 0.5) + Math.abs(dy * 0.866)),
      hexAngle: Math.round(angle / 60) * 60,
      ringP: (y === 0) ? x : (x === 27) ? 28 + y : (y === 7) ? 56 + (27 - x) : 84 + (7 - y),
      ...resolveCellLayout(x - 1, y - 1, isRing),
      out: { h: 0, m: 0, armMask: 0, armAngles: null, borderPair: false, ringWeight: 0, colorH: null, colorS: null, colorL: null, neighborColorH: null, neighborColorS: null, neighborColorL: null },
      timeOut: { h: 0, m: 0 }
    });
  }
}

setupGrid();
window.addEventListener('resize', setupGrid);

let rafActive = !document.hidden;
let id = 0;
let angleOverlayVisible = false;

const biasArrow = (dir) => dir === 1 ? '↻' : dir === -1 ? '↺' : '·';

const storeAngleOverlay = (data) => {
  data.angleOverlay = data.trackSum === undefined ? undefined : Math.round(data.trackSum);
  data.angleBias = data.windDir;
};

const drawAngleOverlay = () => {
  const fontSize = Math.max(11, clockSize * 0.34);
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 220, 100, 0.95)';
  for (let i = 0; i < clocksCache.length; i++) {
    const data = clocksCache[i];
    if (data.angleOverlay === undefined) continue;
    ctx.fillText(`${data.angleOverlay}${biasArrow(data.angleBias)}`, data.cx, data.cy);
  }
};

const toggleAngleOverlay = () => {
  angleOverlayVisible = !angleOverlayVisible;
  if (angleOverlayVisible) {
    for (let i = 0; i < clocksCache.length; i++) storeAngleOverlay(clocksCache[i]);
  }
};

document.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'F3') { e.preventDefault(); togglePerfStats(); return; }
  if (e.code === 'F4') { e.preventDefault(); toggleAngleOverlay(); }
});

const tick = () => {
  if (!rafActive) { id = 0; return; }
  resetPool();
  const frameStart = performance.now();
  const TICK = 1000;
  const MOVE = 500;
  const now = Date.now();
  const cycleId = ~~(now / CYCLE);
  const inRing = currentMode !== 'auto' ? (currentMode !== 'time') : (now % CYCLE < RING_LENGTH);
  const idle = idleState(now);

  if (currentMode === 'auto') {
    const currentPlaying = inRing && idle && idle.strength > 0 ? idle.animType : 'time';
    if (currentPlaying !== lastPlayingMode) {
      lastPlayingMode = currentPlaying;
      controlButtons.forEach((b) => b.classList.toggle('current-playing', b.id.replace('btn-', '') === currentPlaying));
    }
  } else if (lastPlayingMode !== null) {
    lastPlayingMode = null;
    controlButtons.forEach((b) => b.classList.remove('current-playing'));
  }

  const activeMode = currentMode !== 'auto' ? currentMode : (inRing && idle && idle.strength > 0 ? idle.animType : 'time');
  if (activeMode !== lastGlowMode) {
    lastGlowMode = activeMode;
    app.style.setProperty('--glow-color', glowThemes[activeMode] || glowThemes.time);
    for (let i = 0; i < clocksCache.length; i++) {
      clocksCache[i].drawKeyH = undefined;
      clocksCache[i].drawKeyArms = undefined;
      clocksCache[i].drawKeyCustomCount = undefined;
      if (activeMode === 'gravity') resetGravity();
    }
    const idleFn = anims[activeMode];
    if (idleFn?.onEnter) idleFn.onEnter();
  }

  if (inRing) {
    const targetCycle = currentMode !== 'auto' ? currentMode : cycleId;
    if (frozenCycle !== targetCycle) {
      frozenAngles = captureFrozen(now);
      frozenCycle = targetCycle;
    }
  } else {
    frozenAngles = null;
    frozenCycle = -1;
  }

  const baseMs = now - (now % TICK);
  const steppedT = (now - baseMs) >= MOVE ? 1 : easeOutBack(Math.min(1, (now - baseMs) / MOVE));
  const dNow = new Date(baseMs);
  const baseSec = dNow.getSeconds();
  const nextSec = (baseSec + 1) % 60;
  padDigitsFromEpoch(dA, dNow.getHours() * 3600 + dNow.getMinutes() * 60 + baseSec);
  padDigitsFromEpoch(dB, dNow.getHours() * 3600 + dNow.getMinutes() * 60 + baseSec + 1);

  const t = now / 1000;
  frameData.t = t;
  frameData.neonCx1 = Math.cos(t * 0.8) * 8;
  frameData.neonCy1 = Math.sin(t * 1.1) * 2;
  frameData.neonCx2 = Math.cos(t * 0.9 + Math.PI) * 8;
  frameData.neonCy2 = Math.sin(t * 1.3 + Math.PI) * 2;
  frameData.dateT2 = t * 2;
  frameData.vortexPrecessX = Math.sin(t * 0.5) * 1.2;
  frameData.vortexPrecessY = Math.cos(t * 0.3) * 0.5;
  frameData.vortexTimeEffect = 96 * t + 14.4 * Math.sin(t);
  frameData.vortexSpreadTimeEffect = 3.2 * t + 0.48 * Math.sin(t);

  const activeIdleAnim = idle ? anims[idle.animType] : null;
  if (activeIdleAnim && activeIdleAnim.update) {
    activeIdleAnim.update(t);
  }
  
  const idleStrength = idle ? idle.strength : 0;
  const isAutoTimer = currentMode === 'auto' && inRing;
  const handLength = clockSize * 0.45;
  const tetrisArmLength = (clockSize + gap) * 0.47;
  const handThickness = activeMode === 'tetris' || activeMode === 'snake' || activeMode === 'pong'
    ? Math.max(4, clockSize * 0.13)
    : Math.max(3, clockSize * 0.1);
  const capRadius = Math.max(0.9, clockSize * 0.04);
  let timerEx = 0;
  let timerEy = 0;
  if (isAutoTimer) {
    const timerAngle = (now % CYCLE) / RING_LENGTH * 360 - 90;
    timerEx = clocksCache[0].cx + cosDeg(timerAngle) * handLength;
    timerEy = clocksCache[0].cy + sinDeg(timerAngle) * handLength;
  }

  resetHandBuckets();
  ctx.drawImage(gridBgCanvas, 0, 0);

  const canDirty = !activeIdleAnim && !inRing;
  const colonWobble = (now % TICK) < 450;
  const digitTicks = canDirty && steppedT < 1 ? dA.map((v, i) => v !== dB[i]) : null;
  let frameRecalc = 0;
  let frameHands = 0;

  const clockNeedsRecalc = (data, i) => {
    if (data.drawKeyH === undefined && data.drawKeyArms === undefined && data.drawKeyCustomCount === undefined) return true;
    if (isAutoTimer && i === 0) return true;
    if (activeIdleAnim?.digitSource) {
      if (idleStrength < 1) return true;
      if (data.isRing) return true;
      if (data.isColon) return false;
      return digits[activeIdleAnim.digitSource[data.digitIdx]][data.clockIdx].isIdle;
    }
    if (!canDirty) return true;
    if (data.isRing) return steppedT < 1 && digitTicks[data.digitIdx];
    if (data.isColon) return data.colonFill ? steppedT < 1 : colonWobble;
    const ep = timeHandEndpoints(data, dA, dB, baseSec, nextSec);
    if (ep.idle) return steppedT < 1 || data.spinSec !== baseSec;
    return steppedT < 1 && digitTicks[data.digitIdx];
  };

  const storeAndDrawHands = (data, keyH, keyM, exH, eyH, exM, eyM) => {
    data.drawKeyArms = undefined;
    data.drawKeyCustomCount = undefined;
    data.drawKeyH = keyH;
    data.drawKeyM = keyM;
    data.exH = exH;
    data.eyH = eyH;
    data.exM = exM;
    data.eyM = eyM;
    addHandSeg(keyH, data.cx, data.cy, exH, eyH);
    addHandSeg(keyM, data.cx, data.cy, exM, eyM);
    frameRecalc++;
    frameHands += 2;
  };

  const storeAndDrawArms = (data, key, armMask) => {
    data.drawKeyArms = armMask;
    data.drawKeyColor = key;
    data.drawKeyH = undefined;
    data.drawKeyCustomCount = undefined;
    if (!data.armEnds) data.armEnds = new Float32Array(8);
    let handCount = 0;
    for (let a = 0; a < 4; a++) {
      if (armMask & (1 << a)) {
        const ang = TETRIS_ARM_ANGLES[a];
        const ex = data.cx + cosDeg(ang) * tetrisArmLength;
        const ey = data.cy + sinDeg(ang) * tetrisArmLength;
        data.armEnds[a * 2] = ex;
        data.armEnds[a * 2 + 1] = ey;
        addHandSeg(key, data.cx, data.cy, ex, ey);
        handCount++;
      }
    }
    frameRecalc++;
    frameHands += handCount;
  };

  const storeAndDrawCustomArms = (data, key, angles, neighborKey) => {
    data.drawKeyArms = undefined;
    data.drawKeyH = undefined;
    data.drawKeyColor = key;
    data.drawKeyNeighborColor = neighborKey;
    const count = Math.min(angles.length, 4);
    data.drawKeyCustomCount = count;
    if (!data.customArmEnds) data.customArmEnds = new Float32Array(8);
    for (let a = 0; a < count; a++) {
      const ang = angles[a];
      const ex = data.cx + cosDeg(ang) * tetrisArmLength;
      const ey = data.cy + sinDeg(ang) * tetrisArmLength;
      data.customArmEnds[a * 2] = ex;
      data.customArmEnds[a * 2 + 1] = ey;
      const segKey = neighborKey && a >= 2 ? neighborKey : key;
      addHandSeg(segKey, data.cx, data.cy, ex, ey);
      frameHands++;
    }
    frameRecalc++;
  };

  const storeAndDrawBorderHands = (data, key, h, m) => {
    data.drawKeyArms = undefined;
    data.drawKeyCustomCount = undefined;
    data.drawKeyH = key;
    data.drawKeyM = key;
    data.exH = data.cx + cosDeg(h) * tetrisArmLength;
    data.eyH = data.cy + sinDeg(h) * tetrisArmLength;
    data.exM = data.cx + cosDeg(m) * tetrisArmLength;
    data.eyM = data.cy + sinDeg(m) * tetrisArmLength;
    addHandSeg(key, data.cx, data.cy, data.exH, data.eyH);
    addHandSeg(key, data.cx, data.cy, data.exM, data.eyM);
    frameRecalc++;
    frameHands += 2;
  };

  for (let i = 0; i < clocksCache.length; i++) {
    const data = clocksCache[i];
    if (!clockNeedsRecalc(data, i)) {
      if (data.drawKeyCustomCount) {
        const key = data.drawKeyColor;
        const neighborKey = data.drawKeyNeighborColor;
        for (let a = 0; a < data.drawKeyCustomCount; a++) {
          const segKey = neighborKey && a >= 2 ? neighborKey : key;
          addHandSeg(segKey, data.cx, data.cy, data.customArmEnds[a * 2], data.customArmEnds[a * 2 + 1]);
          frameHands++;
        }
        continue;
      }
      if (data.drawKeyArms) {
        const key = data.drawKeyColor;
        for (let a = 0; a < 4; a++) {
          if (data.drawKeyArms & (1 << a)) {
            addHandSeg(key, data.cx, data.cy, data.armEnds[a * 2], data.armEnds[a * 2 + 1]);
            frameHands++;
          }
        }
        continue;
      }
      addHandSeg(data.drawKeyH, data.cx, data.cy, data.exH, data.eyH);
      addHandSeg(data.drawKeyM, data.cx, data.cy, data.exM, data.eyM);
      frameHands += 2;
      continue;
    }

    const time = inRing ? frozenAngles[i] : timeAngles(data, dA, dB, baseSec, nextSec, steppedT, now);
    let h = time.h;
    let m = time.m;

    if (!inRing && !activeIdleAnim) {
      const ep = timeHandEndpoints(data, dA, dB, baseSec, nextSec);
      if (timeUsesHandTracking(ep)) {
        const preferCw = (data.windDir === undefined ? 1 : data.windDir) === 1;
        const tc = applyClockTrack(data.trackSum, data.trackBase, ep.hA, ep.hB, ep.mA, ep.mB, steppedT, data.windDir);
        data.trackSum = tc.track;
        data.trackBase = tc.trackBase;
        data.windDir = tc.windDir;
        if (ep.idle) data.spinSec = baseSec;
        const blendT = steppedT <= 0 ? 0 : steppedT >= 1 ? 1 : steppedT;
        h = biasedLerp(ep.hA, ep.hB, blendT, preferCw);
        m = biasedLerp(ep.mA, ep.mB, blendT, preferCw);
      } else {
        data.trackSum = undefined;
        data.trackBase = undefined;
        data.windDir = undefined;
      }
    } else {
      data.trackSum = undefined;
      data.trackBase = undefined;
      data.windDir = undefined;
    }

    if (activeIdleAnim) {
      data.out.ringWeight = 0;
      activeIdleAnim(data, frameData);
      if (data.out.ringWeight === 2) {
        if (isAutoTimer && i === 0) {
          addHandSeg(COLOR_KEY_WHITE, data.cx, data.cy, timerEx, timerEy);
          frameRecalc++;
          frameHands++;
          continue;
        }
        const armMask = data.out.armMask;
        const armAngles = data.out.armAngles;
        if (!data.out.borderPair && !armMask && !armAngles?.length) {
          data.drawKeyArms = 0;
          data.drawKeyH = undefined;
          data.drawKeyCustomCount = undefined;
          continue;
        }
        const key = packColor(
          quantizeHue(data.out.colorH),
          data.out.colorS,
          data.out.colorL
        );
        if (armAngles?.length) {
          const neighborKey = data.out.neighborColorH != null
            ? packColor(quantizeHue(data.out.neighborColorH), data.out.neighborColorS, data.out.neighborColorL)
            : undefined;
          storeAndDrawCustomArms(data, key, armAngles, neighborKey);
        } else if (data.out.borderPair) {
          storeAndDrawBorderHands(data, key, data.out.h, data.out.m);
        } else {
          storeAndDrawArms(data, key, armMask);
        }
        continue;
      }
      if (data.out.ringWeight > 0) {
        const blend = idleStrength;
        h = lerp(time.h, data.out.h, blend);
        m = lerp(time.m, data.out.m, blend);
        const [baseHue, baseS, baseL] = arcadeHandHsl(data.trackSum, h);
        let colorHH, colorHS, colorHL;
        if (data.out.colorH != null) {
          colorHH = quantizeHue(mixHue(baseHue, data.out.colorH, blend));
          colorHS = Math.round(baseS + (data.out.colorS - baseS) * blend);
          colorHL = Math.round(baseL + (data.out.colorL - baseL) * blend);
        } else {
          colorHH = baseHue;
          colorHS = baseS;
          colorHL = baseL;
        }
        if (isAutoTimer && i === 0) {
          addHandSeg(COLOR_KEY_WHITE, data.cx, data.cy, timerEx, timerEy);
          frameRecalc++;
          frameHands++;
          continue;
        }
        const keyH = packColor(colorHH, colorHS, colorHL);
        storeAndDrawHands(data, keyH, keyH,
          data.cx + cosDeg(h) * handLength, data.cy + sinDeg(h) * handLength,
          data.cx + cosDeg(m) * handLength, data.cy + sinDeg(m) * handLength);
        if (activeMode === 'time') storeAngleOverlay(data);
        continue;
      }
    }

    if (isAutoTimer && i === 0) {
      addHandSeg(COLOR_KEY_WHITE, data.cx, data.cy, timerEx, timerEy);
      frameRecalc++;
      frameHands++;
      continue;
    }

    const [colorHH, colorHS, colorHL] = arcadeHandHsl(data.trackSum, h);
    const keyH = packColor(colorHH, colorHS, colorHL);
    storeAndDrawHands(data, keyH, keyH,
      data.cx + cosDeg(h) * handLength, data.cy + sinDeg(h) * handLength,
      data.cx + cosDeg(m) * handLength, data.cy + sinDeg(m) * handLength);
    if (activeMode === 'time') storeAngleOverlay(data);
  }

  ctx.lineWidth = handThickness;
  flushGeometryPipeline(ctx, handThickness);

  ctx.fillStyle = BG.cap;
  ctx.strokeStyle = BG.capStroke;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < clocksCache.length; i++) {
    const c = clocksCache[i];
    ctx.moveTo(c.cx + capRadius, c.cy);
    ctx.arc(c.cx, c.cy, capRadius, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();

  if (angleOverlayVisible && activeMode === 'time') drawAngleOverlay();
  if (typeof processPerfFrame === 'function') processPerfFrame(frameStart, frameRecalc, frameHands);

  id = requestAnimationFrame(tick);
};

document.addEventListener('visibilitychange', () => {
  rafActive = !document.hidden;
  if (rafActive && !id) id = requestAnimationFrame(tick);
});

dataProvider.init();
if (!document.hidden) id = requestAnimationFrame(tick);
