const matrixTicker = createTicker(0.1);

const randomizeBufferAngles = (ci) => {
  globalGridBuffer[ci] = Math.floor(Math.random() * 8) * 45;
  globalGridBuffer[ci + 1] = Math.floor(Math.random() * 8) * 45;
};

for (let x = 0; x < GRID_COLS; x++) {
  for (let y = 0; y < GRID_ROWS; y++) {
    const i = cellIdx(x, y);
    randomizeBufferAngles(i);
    globalGridBuffer[i + 2] = 0;
  }
}

const matrixEngine = createParticleEngine(
  { x: 0, y: 0, speed: 0 },
  (drop, dt) => {
    const oldY = Math.floor(drop.y);
    drop.y += drop.speed * dt;
    const newY = Math.floor(drop.y);
    if (newY >= 0 && newY < GRID_ROWS) {
      const ci = cellIdx(drop.x, newY);
      globalGridBuffer[ci + 2] = 1.0;
      gridFlags[flagIdx(drop.x, newY)] = CELL_HEAD;
      if (newY !== oldY) randomizeBufferAngles(ci);
    }
    return drop.y <= 16;
  },
  0.3,
  () => ({
    x: Math.floor(Math.random() * GRID_COLS),
    y: -Math.random() * GRID_ROWS,
    speed: 3 + Math.random() * 5
  }),
  20
);

const updateMatrix = (t) => {
  matrixTicker.tick(t, (dt) => {
    for (let x = 0; x < GRID_COLS; x++) {
      for (let y = 0; y < GRID_ROWS; y++) {
        const i = cellIdx(x, y);
        globalGridBuffer[i + 2] = Math.max(0, globalGridBuffer[i + 2] - dt * 0.4);
        gridFlags[flagIdx(x, y)] = 0;
        if (globalGridBuffer[i + 2] > 0.3 && Math.random() < 0.05) randomizeBufferAngles(i);
      }
    }
    matrixEngine.tick(dt);
  });
};

const matrixIdle = (data, frameData) => {
  const i = cellIdx(data.x, data.y);
  const isHead = gridFlags[flagIdx(data.x, data.y)] === CELL_HEAD;
  const brightness = globalGridBuffer[i + 2];

  if (data.matrixH === undefined) {
    data.matrixH = globalGridBuffer[i];
    data.matrixM = globalGridBuffer[i + 1];
  }

  easeAnglePair(data, 'matrixH', 'matrixM', isHead ? 90 : globalGridBuffer[i], isHead ? 270 : globalGridBuffer[i + 1], isHead ? 0.8 : 0.25);
  const hsl = brightness > 0
    ? (isHead ? [120, 100, 95] : [128, Math.floor(60 + brightness * 40), Math.floor(4 + brightness * 40)])
    : [130, 100, 2];
  setOut(data, data.matrixH, data.matrixM, hsl);
};

matrixIdle.update = updateMatrix;
