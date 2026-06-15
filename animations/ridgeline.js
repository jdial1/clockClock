const hash = (n) => {
  let x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const getHColumn = (px, t, y) => {
  let h = 0;
  for (let i = 0; i < 3; i++) {
    const seed = y * 10 + i + 1;
    const speed = (hash(seed) * 2.0 + 1.0) * (hash(seed + 1) > 0.5 ? 1 : -1);
    const offset = hash(seed + 2) * 100;
    const height = hash(seed + 3) * 1.2 + 0.6;
    const type = hash(seed + 4) > 0.5 ? 1 : 0;

    const pos = ((offset + t * speed) % 40 + 40) % 40 - 5;
    const dist = Math.abs(px - pos);
    let spikeH = 0;

    if (type === 0) {
      spikeH = Math.max(0, height * (1 - dist / 1.5));
    } else if (dist < 0.5) {
      spikeH = height;
    } else {
      spikeH = Math.max(0, height * (1 - (dist - 0.5) / 1.5));
    }

    h += spikeH;
  }

  const distFromCenter = Math.abs(px - 13.5);
  let envelope = 0;
  if (distFromCenter < 12) {
    envelope = Math.cos((distFromCenter / 12) * Math.PI / 2);
    envelope *= envelope;
  }

  return h * envelope;
};

let lastRidgeT = -1;
let lastRidgeRow = -1;
const heightCacheRows = Array.from({ length: 8 }, () => new Float32Array(31));

const ensureRidgeCache = (t, y) => {
  if (t !== lastRidgeT || y !== lastRidgeRow) {
    lastRidgeT = t;
    lastRidgeRow = y;
    const row = heightCacheRows[y];
    for (let col = -1; col <= 29; col++) {
      row[col + 1] = getHColumn(col, t, y);
    }
  }
};

const ridgelineIdle = (data, frameData) => {
  const t = frameData.t;
  const x = data.x;
  const y = data.y;

  ensureRidgeCache(t, y);
  const row = heightCacheRows[y];

  const h_center = row[x + 1];
  const h_left = row[x];
  const h_right = row[x + 2];

  const dy_left = h_center - h_left;
  const angle_left = Math.atan2(dy_left, -1) * 180 / Math.PI;

  const dy_right = h_center - h_right;
  const angle_right = Math.atan2(dy_right, 1) * 180 / Math.PI;

  data.out.h = angle_left;
  data.out.m = angle_right;
  const elevation = Math.min(1.5, h_center) / 1.5;
  data.out.colorH = 175 + elevation * 55;
  data.out.colorS = 85;
  data.out.colorL = 12 + elevation * 58;
  data.out.color = null;
  data.out.ringWeight = 1;
};
