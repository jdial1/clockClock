const CARDINAL = {
  up: 270,
  down: 90,
  left: 180,
  right: 0
};

const WASD_TO_DIR = {
  KeyW: CARDINAL.up,
  KeyS: CARDINAL.down,
  KeyA: CARDINAL.left,
  KeyD: CARDINAL.right
};

const ARROW_TO_DIR = {
  ArrowUp: CARDINAL.up,
  ArrowDown: CARDINAL.down,
  ArrowLeft: CARDINAL.left,
  ArrowRight: CARDINAL.right
};


const ARM_HSL = [
  [185, 100, 58],
  [120, 100, 55],
  [310, 100, 62],
  [38, 100, 58]
];
const SELECT_RING = 'rgba(255, 0, 255, 0.85)';
const CARDINAL_ANGLES = new Set([0, 90, 180, 270]);
const ANGLE_TO_DIR = { 0: 'R', 90: 'D', 180: 'L', 270: 'U' };
const DIR_TO_ANGLE = { R: 0, D: 90, L: 180, U: 270, r: 0, d: 90, l: 180, u: 270 };

const packColor = (h, s, l) => (((Math.round(h) % 360 / 2) << 16) | (Math.round(s) << 8) | Math.round(l)) >>> 0;
const strokeForKey = (key) => {
  const h = ((key >> 16) & 0xff) * 2;
  const s = (key >> 8) & 0xff;
  const l = key & 0xff;
  return `hsl(${h}, ${s}%, ${l}%)`;
};

const sinDeg = (deg) => Math.sin(deg * Math.PI / 180);
const cosDeg = (deg) => Math.cos(deg * Math.PI / 180);

const app = document.createElement('div');
app.className = 'app blank-app';
document.getElementById('root').appendChild(app);

const canvas = document.createElement('canvas');
app.appendChild(canvas);
const ctx = canvas.getContext('2d');

const clocks = [];
let clockSize = 0;
let gap = 0;
let gridWidth = 0;
let gridHeight = 0;
let faceSize = 0;
let dpr = 1;
let faceCanvas = null;
let gridBgCanvas = null;
let selectedIndex = -1;


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
  for (let i = 0; i < clocks.length; i++) {
    const c = clocks[i];
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
  for (let i = 0; i < clocks.length; i++) {
    const c = clocks[i];
    c.cx = Math.round(c.x * (clockSize + gap) + clockSize / 2);
    c.cy = Math.round(c.y * (clockSize + gap) + clockSize / 2);
  }
  buildFaceCanvas();
  preRenderGridBackground();
};

for (let y = 0; y < GRID_ROWS; y++) {
  for (let x = 0; x < GRID_COLS; x++) {
    clocks.push({ x, y, cx: 0, cy: 0, arms: [null, null, null, null] });
  }
}

setupGrid();
window.addEventListener('resize', setupGrid);

const hitTest = (px, py) => {
  const radius = clockSize * 0.52;
  for (let i = clocks.length - 1; i >= 0; i--) {
    const c = clocks[i];
    if (Math.hypot(px - c.cx, py - c.cy) <= radius) return i;
  }
  return -1;
};

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (gridWidth / rect.width);
  const y = (e.clientY - rect.top) * (gridHeight / rect.height);
  selectedIndex = hitTest(x, y);
});

document.addEventListener('keydown', (e) => {
  if (selectedIndex < 0) return;
  const wasdDir = WASD_TO_DIR[e.code];
  const arrowDir = ARROW_TO_DIR[e.code];
  if (wasdDir === undefined && arrowDir === undefined) return;
  e.preventDefault();
  const arms = clocks[selectedIndex].arms;
  if (wasdDir !== undefined) arms[e.shiftKey ? 1 : 0] = wasdDir;
  if (arrowDir !== undefined) arms[e.shiftKey ? 3 : 2] = arrowDir;
});

const encodeDir = (angle) => (angle === null ? null : ANGLE_TO_DIR[angle] ?? null);

const decodeDir = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && CARDINAL_ANGLES.has(value)) return value;
  if (typeof value === 'string') return DIR_TO_ANGLE[value] ?? null;
  return null;
};

const encodeCell = (c) => {
  if (c.arms.every((angle) => angle === null)) return null;
  return c.arms.map(encodeDir);
};

const decodeCell = (cell) => {
  const arms = [null, null, null, null];
  if (cell === null || cell === undefined) return arms;
  if (!Array.isArray(cell)) return arms;
  for (let i = 0; i < cell.length && i < 4; i++) arms[i] = decodeDir(cell[i]);
  return arms;
};

const applyCell = (c, cell) => {
  const arms = decodeCell(cell);
  for (let i = 0; i < 4; i++) c.arms[i] = arms[i];
};

const exportGridState = () => {
  const cells = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    const row = [];
    for (let x = 0; x < GRID_COLS; x++) {
      row.push(encodeCell(clocks[y * GRID_COLS + x]));
    }
    cells.push(row);
  }
  return { v: 1, cols: GRID_COLS, rows: GRID_ROWS, cells };
};

const importGridState = (data) => {
  if (!data || data.cells === undefined) return false;

  if (!Array.isArray(data.cells)) {
    for (let i = 0; i < clocks.length; i++) {
      for (let a = 0; a < 4; a++) clocks[i].arms[a] = null;
    }
    for (const [key, cell] of Object.entries(data.cells)) {
      const [x, y] = key.split(',').map(Number);
      if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return false;
      applyCell(clocks[y * GRID_COLS + x], cell);
    }
    return true;
  }

  if (data.cols !== GRID_COLS || data.rows !== GRID_ROWS) return false;
  if (data.cells.length !== GRID_ROWS) return false;
  for (let y = 0; y < GRID_ROWS; y++) {
    const row = data.cells[y];
    if (!Array.isArray(row) || row.length !== GRID_COLS) return false;
    for (let x = 0; x < GRID_COLS; x++) {
      applyCell(clocks[y * GRID_COLS + x], row[x]);
    }
  }
  return true;
};

const ARM_SPLIT_OFFSET = 10;

const resolveArmDrawAngles = (arms) => {
  const dirCount = { 0: 0, 90: 0, 180: 0, 270: 0 };
  const drawAngles = [null, null, null, null];
  for (let a = 0; a < 4; a++) {
    if (arms[a] !== null) dirCount[arms[a]]++;
  }
  const dirSlot = { 0: 0, 90: 0, 180: 0, 270: 0 };
  for (let a = 0; a < 4; a++) {
    const dir = arms[a];
    if (dir === null) continue;
    const total = dirCount[dir];
    const slot = dirSlot[dir]++;
    if (total === 1) {
      drawAngles[a] = dir;
    } else if (total === 2) {
      drawAngles[a] = slot === 0
        ? (dir - ARM_SPLIT_OFFSET + 360) % 360
        : (dir + ARM_SPLIT_OFFSET) % 360;
    } else {
      drawAngles[a] = (dir + (slot - (total - 1) / 2) * ARM_SPLIT_OFFSET + 360) % 360;
    }
  }
  return drawAngles;
};

const downloadJson = (payload, filename) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

document.getElementById('btn-export').addEventListener('click', () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  downloadJson(exportGridState(), `clock-grid-${stamp}.json`);
});

const importInput = document.getElementById('import-file');
document.getElementById('btn-import').addEventListener('click', () => importInput.click());
importInput.addEventListener('change', () => {
  const file = importInput.files[0];
  importInput.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      if (!importGridState(JSON.parse(reader.result))) {
        window.alert('Import failed: expected a shape cells map or full 28×8 grid export.');
        return;
      }
    } catch {
      window.alert('Import failed: invalid JSON.');
    }
  };
  reader.readAsText(file);
});

const drawHands = () => {
  const handLength = clockSize * 0.45;
  const handThickness = Math.max(3, clockSize * 0.1);
  const capRadius = Math.max(0.9, clockSize * 0.04);
  const buckets = new Map();

  const queueSeg = (key, cx, cy, ex, ey) => {
    let segs = buckets.get(key);
    if (!segs) {
      segs = [];
      buckets.set(key, segs);
    }
    segs.push(cx, cy, ex, ey);
  };

  for (let i = 0; i < clocks.length; i++) {
    const c = clocks[i];
    const drawAngles = resolveArmDrawAngles(c.arms);
    for (let a = 0; a < 4; a++) {
      if (drawAngles[a] === null) continue;
      const [hH, hS, hL] = ARM_HSL[a];
      const key = packColor(hH, hS, hL);
      queueSeg(key, c.cx, c.cy, c.cx + cosDeg(drawAngles[a]) * handLength, c.cy + sinDeg(drawAngles[a]) * handLength);
    }
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = handThickness;
  for (const [key, segs] of buckets) {
    ctx.strokeStyle = strokeForKey(key);
    ctx.beginPath();
    for (let j = 0; j < segs.length; j += 4) {
      ctx.moveTo(segs[j], segs[j + 1]);
      ctx.lineTo(segs[j + 2], segs[j + 3]);
    }
    ctx.stroke();
  }

  ctx.fillStyle = BG.cap;
  ctx.strokeStyle = BG.capStroke;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < clocks.length; i++) {
    const c = clocks[i];
    ctx.moveTo(c.cx + capRadius, c.cy);
    ctx.arc(c.cx, c.cy, capRadius, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();

  if (selectedIndex >= 0) {
    const c = clocks[selectedIndex];
    const r = clockSize * 0.54;
    ctx.beginPath();
    ctx.arc(c.cx, c.cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = SELECT_RING;
    ctx.lineWidth = Math.max(2, clockSize * 0.06);
    ctx.stroke();
  }
};

const tick = () => {
  ctx.drawImage(gridBgCanvas, 0, 0);
  drawHands();
  requestAnimationFrame(tick);
};

requestAnimationFrame(tick);
