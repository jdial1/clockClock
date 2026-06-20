const tetrisTicker = createTicker(0.02);

const tGrid = new Uint8Array(GRID_COLS * GRID_ROWS);
const tPieceId = new Uint16Array(GRID_COLS * GRID_ROWS);
let activePiece = null;
let tetrisState = 'playing';
let stateTimer = 0;
let spawnCooldown = 0;
let pieceIdCounter = 0;
let tetrisIntroPlayed = false;

const mirrorShapeH = (shape) => {
  const maxX = Math.max(...shape.map(p => p[0]));
  return shape.map(([x, y]) => [maxX - x, y]);
};

const L_SHAPES = [
  [[2,0], [0,1], [1,1], [2,1]],
  [[1,0], [1,1], [1,2], [0,2]],
  [[0,0], [1,0], [2,0], [2,1]],
  [[0,0], [0,1], [0,2], [1,2]]
];

const S_SHAPES = [
  [[1,0], [2,0], [0,1], [1,1]],
  [[0,0], [0,1], [1,1], [1,2]]
];

const TETRIS_SHAPES = [
  [ [[0,0], [1,0], [2,0], [3,0]], [[0,0], [0,1], [0,2], [0,3]] ],
  L_SHAPES.map(mirrorShapeH),
  L_SHAPES,
  [ [[0,0], [1,0], [0,1], [1,1]] ],
  S_SHAPES,
  [ [[1,0], [0,1], [1,1], [2,1]], [[0,0], [0,1], [1,1], [0,2]], [[0,0], [1,0], [2,0], [1,1]], [[1,0], [0,1], [1,1], [1,2]] ],
  S_SHAPES.map(mirrorShapeH)
];

const TETRIS_COLORS = [
  [180, 100, 50],
  [224, 100, 50],
  [33, 100, 50],
  [60, 100, 50],
  [120, 100, 50],
  [282, 100, 41],
  [340, 100, 50]
];

const TETRIS_WIREFRAME_EXTERIOR = [0, 90, 180, 270];

const shapeExtents = (shape) => {
  const xs = shape.map(p => p[0]);
  const ys = shape.map(p => p[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
};

const getTetrisBlockPieceId = (x, y) => {
  if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return 0;
  const idx = y * GRID_COLS + x;
  if (tPieceId[idx]) return tPieceId[idx];
  if (activePiece) {
    const shape = TETRIS_SHAPES[activePiece.type][activePiece.rot];
    const py = Math.floor(activePiece.y);
    if (shape.some(([sx, sy]) => activePiece.x + sx === x && py + sy === y)) return activePiece.id;
  }
  return 0;
};

const buildWireframeArms = (x, y, pieceId) => {
  const arms = [];
  if (getTetrisBlockPieceId(x, y - 1) === pieceId) arms.push(270);
  if (getTetrisBlockPieceId(x + 1, y) === pieceId) arms.push(0);
  if (getTetrisBlockPieceId(x, y + 1) === pieceId) arms.push(90);
  if (getTetrisBlockPieceId(x - 1, y) === pieceId) arms.push(180);
  return arms.length ? arms : TETRIS_WIREFRAME_EXTERIOR;
};

const clearTetrisBoard = () => {
  tGrid.fill(0);
  tPieceId.fill(0);
  activePiece = null;
};

const lockTetrisPiece = (id, type, rot, x, blockY) => {
  TETRIS_SHAPES[type][rot].forEach(([sx, sy]) => {
    const px = x + sx;
    const py = blockY + sy;
    if (py >= 0 && py < GRID_ROWS && px >= 0 && px < GRID_COLS) {
      const idx = py * GRID_COLS + px;
      tGrid[idx] = type + 1;
      tPieceId[idx] = id;
    }
  });
};

const isTetrisShapeClear = (shape, x, y) => shape.every(([sx, sy]) => {
  const px = x + sx;
  const py = y + sy;
  return px >= 0 && px < GRID_COLS && py < GRID_ROWS && (py < 0 || !tGrid[py * GRID_COLS + px]);
});

const getTetrisDropY = (shape, x) => {
  let dropY = -1;
  for (let y = -4; y < GRID_ROWS; y++) {
    if (isTetrisShapeClear(shape, x, y)) dropY = y;
  }
  return dropY;
};

const buildIntroLayout = () => {
  const specs = [{ type: 3, rot: 0 }, { type: 0, rot: 1 }, { type: 2, rot: 1 }, { type: 1, rot: 1 }, { type: 6, rot: 0 }, { type: 4, rot: 0 }, { type: 5, rot: 0 }];
  let x = 1;
  return specs.map(spec => {
    const { minX, maxX, maxY } = shapeExtents(TETRIS_SHAPES[spec.type][spec.rot]);
    const piece = { ...spec, x: x - minX, y: GRID_ROWS - 1 - maxY };
    x += (maxX - minX) + 2;
    return piece;
  });
};

const startTetrisIntro = () => {
  clearTetrisBoard();
  tetrisState = 'intro';
  stateTimer = 5;
  spawnCooldown = 0;
  buildIntroLayout().forEach(piece => {
    lockTetrisPiece(++pieceIdCounter, piece.type, piece.rot, piece.x, piece.y);
  });
};

const evaluateTetrisBoard = (shape, x, dropY) => {
  shape.forEach(([sx, sy]) => { if (dropY + sy >= 0) tGrid[(dropY + sy) * GRID_COLS + (x + sx)] = 1; });

  let holes = 0;
  let aggregateHeight = 0;
  for (let c = 0; c < GRID_COLS; c++) {
    let top = -1;
    for (let r = 0; r < GRID_ROWS; r++) {
      if (tGrid[r * GRID_COLS + c]) {
        if (top === -1) top = r;
      } else if (top !== -1) {
        holes++;
      }
    }
    if (top !== -1) aggregateHeight += (GRID_ROWS - top);
  }

  shape.forEach(([sx, sy]) => { if (dropY + sy >= 0) tGrid[(dropY + sy) * GRID_COLS + (x + sx)] = 0; });

  return -holes * 10 - aggregateHeight;
};

const getBestTetrisMove = (type) => {
  let bestScore = -Infinity;
  let bestX = 0;
  let bestRot = 0;
  const rotations = TETRIS_SHAPES[type];

  for (let r = 0; r < rotations.length; r++) {
    const shape = rotations[r];
    const { minX, maxX } = shapeExtents(shape);

    for (let x = -minX; x < GRID_COLS - maxX; x++) {
      const dropY = getTetrisDropY(shape, x);
      if (dropY < 0) continue;

      const score = evaluateTetrisBoard(shape, x, dropY) + Math.random() * 0.1;
      if (score > bestScore) {
        bestScore = score;
        bestX = x;
        bestRot = r;
      }
    }
  }
  return { x: bestX, rot: bestRot, score: bestScore };
};

const spawnTetrisPiece = () => {
  const type = Math.floor(Math.random() * 7);
  const { x, rot, score } = getBestTetrisMove(type);
  const shape = TETRIS_SHAPES[type][rot];
  const targetY = getTetrisDropY(shape, x);

  if (score === -Infinity || targetY < 0) {
    tetrisState = 'flash';
    stateTimer = 1.5;
    return;
  }

  activePiece = {
    id: ++pieceIdCounter,
    type,
    rot,
    x,
    y: -4 - shapeExtents(shape).minY,
    targetY
  };
};

const updateTetris = (t) => {
  tetrisTicker.tick(t, (dt) => {
    if (tetrisState === 'intro') {
      stateTimer -= dt;
      if (stateTimer <= 0) {
        clearTetrisBoard();
        tetrisState = 'playing';
        spawnCooldown = 0.5;
      }
      return;
    }

    if (tetrisState === 'playing') {
      if (spawnCooldown > 0) {
        spawnCooldown -= dt;
        return;
      }

      if (!activePiece) {
        spawnTetrisPiece();
      } else {
        activePiece.y += 10 * dt;
        if (activePiece.y >= activePiece.targetY) {
          lockTetrisPiece(
            activePiece.id,
            activePiece.type,
            activePiece.rot,
            activePiece.x,
            activePiece.targetY
          );
          activePiece = null;
          spawnCooldown = 0.8;
        }
      }
    } else if (tetrisState === 'flash') {
      stateTimer -= dt;
      if (stateTimer <= 0) tetrisState = 'clear';
    } else if (tetrisState === 'clear') {
      clearTetrisBoard();
      tetrisState = 'playing';
      spawnCooldown = 0.5;
    }
  });
};

const tetrisIdle = (data, frameData) => {
  const pieceId = getTetrisBlockPieceId(data.x, data.y);
  if (!pieceId) {
    setArmsOut(data, 0, [280, 50, 6]);
    return;
  }

  const colorType = (activePiece && activePiece.id === pieceId)
    ? activePiece.type
    : tGrid[data.y * GRID_COLS + data.x] - 1;

  let color = TETRIS_COLORS[colorType];
  if (tetrisState === 'flash' || tetrisState === 'intro') {
    const bright = Math.sin(stateTimer * Math.PI * 8) > 0 ? 80 : 40;
    color = [color[0], color[1], bright];
  }

  setTetrisArmsOut(data, buildWireframeArms(data.x, data.y, pieceId), color);
};

tetrisIdle.update = updateTetris;
tetrisIdle.onEnter = () => {
  if (tetrisIntroPlayed) return;
  tetrisIntroPlayed = true;
  startTetrisIntro();
};
