const mod = (n, m) => ((n % m) + m) % m;
const lerp = (a, b, f) => a + ((b - a + 540) % 360 - 180) * f;

const vecPool = Array.from({ length: 300 }, () => ({ x: 0, y: 0, angle: 0, mag: 0 }));
let vecPoolIdx = 0;

const resetPool = () => { vecPoolIdx = 0; };

const allocVec = (x, y) => {
  const v = vecPool[vecPoolIdx++];
  v.x = x;
  v.y = y;
  v.angle = Math.atan2(y, x);
  v.mag = Math.hypot(x, y);
  return v;
};

const getSpatialMetrics = (clock, frameData) => {
  const t = frameData.t;
  return {
    t,
    handLength: clockSize * 0.45,
    distFromCenter: Math.hypot(clock.dx, clock.dy),
    ripple: Math.sin(clock.dx * 0.4 - t * 3) * Math.cos(clock.dy * 0.4 - t * 3),
    hexDist: clock.hexDist,
    hexAngle: clock.hexAngle
  };
};

const vortexField = (clock, frameData) => {
  const px = clock.dx - frameData.vortexPrecessX;
  const py = clock.dy - frameData.vortexPrecessY;
  const dist = Math.hypot(px, py * 2);
  const angle = Math.atan2(py * 2, px) * 180 / Math.PI;
  return { px, py, dist, angle };
};

const neonField = (clock, frameData) => ({
  d1: Math.hypot(clock.dx - frameData.neonCx1, clock.dy - frameData.neonCy1),
  d2: Math.hypot(clock.dx - frameData.neonCx2, clock.dy - frameData.neonCy2)
});

const oscillatingSpread = (phase, amp = 45) => 45 + Math.sin(phase) * amp;

const waveBlend = (wave) => Math.pow((wave + 1) * 0.5, 3);

const packHsl = (h, s, l) => `hsl(${mod(Math.round(h), 360)}, ${Math.round(s)}%, ${Math.round(l)}%)`;

const ringPos = (data) => {
  const { x, y } = data;
  if (x === 0 && y === 0) return BR;
  if (x === 27 && y === 0) return BL;
  if (x === 0 && y === 7) return TR;
  if (x === 27 && y === 7) return TL;
  if (y === 0 || y === 7) return H;
  return V;
};

const invalidateDrawKeys = () => {
  if (typeof clocksCache === 'undefined') return;
  for (let i = 0; i < clocksCache.length; i++) {
    clocksCache[i].drawKeyH = undefined;
    clocksCache[i].drawKeyArms = undefined;
  }
};

const easeAngle = (cur, tgt, rate) => {
  const d = ((tgt - cur + 540) % 360) - 180;
  return (cur + d * rate + 360) % 360;
};

const easeAnglePair = (state, hKey, mKey, targetH, targetM, rate) => {
  state[hKey] = easeAngle(state[hKey], targetH, rate);
  state[mKey] = easeAngle(state[mKey], targetM, rate);
};

const clampDt = (t, lastRef, max) => {
  let dt = t - lastRef.val;
  if (dt > max) dt = max;
  lastRef.val = t;
  return dt;
};

const createTicker = (maxDt = 0.1) => {
  const state = { val: 0 };
  return {
    state,
    tick(t, callback) {
      let dt = t - state.val;
      if (dt > maxDt) dt = maxDt;
      state.val = t;
      if (dt > 0) callback(dt);
    },
    reset() { state.val = 0; }
  };
};

const formatToDigits = (value, length = 3, paddingValue = 10, specialMappings = {}, options = {}) => {
  const result = Array(length).fill(paddingValue);
  const tokens = [];
  for (const char of String(value)) {
    if (specialMappings[char] !== undefined) tokens.push(specialMappings[char]);
    else if (char >= '0' && char <= '9') tokens.push(parseInt(char, 10));
  }
  const useSuffix = options.suffix !== undefined && tokens.length < length;
  const padCount = useSuffix ? length - tokens.length - 1 : Math.max(0, length - tokens.length);
  let slot = options.align === 'right' ? padCount : 0;
  const limit = useSuffix ? length - 1 : length;
  for (const tok of tokens) {
    if (slot < limit) result[slot++] = tok;
  }
  if (useSuffix) result[length - 1] = options.suffix;
  return result;
};

const createPool = (defaults) => {
  const pool = [];
  return {
    take(assign) {
      const item = pool.pop() || { ...defaults };
      Object.assign(item, assign);
      return item;
    },
    release(arr, i) {
      pool.push(arr[i]);
      arr[i] = arr[arr.length - 1];
      arr.pop();
    }
  };
};

const setOut = (data, h, m, hsl) => {
  data.out.h = h;
  data.out.m = m;
  data.out.armMask = 0;
  data.out.armAngles = null;
  data.out.borderPair = false;
  data.out.ringWeight = 1;
  if (hsl) {
    data.out.colorH = hsl[0];
    data.out.colorS = hsl[1];
    data.out.colorL = hsl[2];
  }
};

const ARM_N = 1;
const ARM_E = 2;
const ARM_S = 4;
const ARM_W = 8;

const setArmsOut = (data, armMask, hsl) => {
  data.out.armMask = armMask;
  data.out.armAngles = null;
  data.out.borderPair = false;
  data.out.ringWeight = 2;
  if (hsl) {
    data.out.colorH = hsl[0];
    data.out.colorS = hsl[1];
    data.out.colorL = hsl[2];
  }
};

const setTetrisArmsOut = (data, angles, hsl, neighborHsl) => {
  data.out.armAngles = angles;
  data.out.armMask = 0;
  data.out.borderPair = false;
  data.out.ringWeight = 2;
  data.out.colorH = hsl[0];
  data.out.colorS = hsl[1];
  data.out.colorL = hsl[2];
  if (neighborHsl) {
    data.out.neighborColorH = neighborHsl[0];
    data.out.neighborColorS = neighborHsl[1];
    data.out.neighborColorL = neighborHsl[2];
  } else {
    data.out.neighborColorH = null;
    data.out.neighborColorS = null;
    data.out.neighborColorL = null;
  }
};

const setBorderOut = (data, h, m, hsl) => {
  data.out.h = h;
  data.out.m = m;
  data.out.armAngles = null;
  data.out.armMask = 0;
  data.out.borderPair = true;
  data.out.ringWeight = 2;
  data.out.colorH = hsl[0];
  data.out.colorS = hsl[1];
  data.out.colorL = hsl[2];
};

const dualSpread = (base, spread, mFlip = 0) => ({
  h: base + spread,
  m: base - spread + mFlip
});
