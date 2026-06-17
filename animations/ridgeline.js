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
const heightCacheRows = Array.from({ length: 8 }, () => new Float32Array(31));

const ensureRidgeCache = (t) => {
  if (t === lastRidgeT) return;
  lastRidgeT = t;
  for (let y = 0; y < 8; y++) {
    const row = heightCacheRows[y];
    for (let col = -1; col <= 29; col++) {
      row[col + 1] = getHColumn(col, t, y);
    }
  }
};

const ridgelineIdle = (data, frameData) => {
  ensureRidgeCache(frameData.t);
  const row = heightCacheRows[data.y];
  const h_center = row[data.x + 1];
  const h_left = row[data.x];
  const h_right = row[data.x + 2];
  const angle_left = Math.atan2(h_center - h_left, -1) * 180 / Math.PI;
  const angle_right = Math.atan2(h_center - h_right, 1) * 180 / Math.PI;
  const elevation = Math.min(1.5, h_center) / 1.5;
  setOut(data, angle_left, angle_right, [175 + elevation * 55, 85, 12 + elevation * 58]);
};
