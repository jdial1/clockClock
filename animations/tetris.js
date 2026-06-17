const tetrisTicker = createTicker(0.02);

const tGrid = new Uint8Array(GRID_COLS * GRID_ROWS);
const tPieceId = new Uint16Array(GRID_COLS * GRID_ROWS);
let activePiece = null;
let tetrisState = 'playing';
let stateTimer = 0;
let spawnCooldown = 0;
let pieceIdCounter = 0;

const TETRIS_SHAPES = [
  [ [[0,0], [1,0], [2,0], [3,0]], [[0,0], [0,1], [0,2], [0,3]] ],
  [ [[0,0], [0,1], [1,1], [2,1]], [[1,0], [1,1], [1,2], [0,2]], [[0,0], [1,0], [2,0], [2,1]], [[0,0], [1,0], [0,1], [0,2]] ],
  [ [[2,0], [0,1], [1,1], [2,1]], [[0,0], [1,0], [1,1], [1,2]], [[0,0], [1,0], [2,0], [0,1]], [[0,0], [0,1], [0,2], [1,2]] ],
  [ [[0,0], [1,0], [0,1], [1,1]] ],
  [ [[1,0], [2,0], [0,1], [1,1]], [[0,0], [0,1], [1,1], [1,2]] ],
  [ [[1,0], [0,1], [1,1], [2,1]], [[0,0], [0,1], [1,1], [0,2]], [[0,0], [1,0], [2,0], [1,1]], [[1,0], [0,1], [1,1], [1,2]] ],
  [ [[0,0], [1,0], [1,1], [2,1]], [[1,0], [0,1], [1,1], [0,2]] ]
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

const isTetrisValid = (shape, x, y) => {
  for (let i = 0; i < shape.length; i++) {
    const px = x + shape[i][0];
    const py = y + shape[i][1];
    if (px < 0 || px >= GRID_COLS || py >= GRID_ROWS) return false;
    if (py >= 0 && tGrid[py * GRID_COLS + px]) return false;
  }
  return true;
};

const getTetrisDropY = (shape, x) => {
  for (let y = 0; y < GRID_ROWS; y++) {
    if (!isTetrisValid(shape, x, y)) return y - 1;
  }
  return GRID_ROWS - 1;
};

const evaluateTetrisBoard = (shape, x, dropY) => {
  for (let i = 0; i < shape.length; i++) {
    const py = dropY + shape[i][1];
    if (py >= 0) tGrid[py * GRID_COLS + (x + shape[i][0])] = 1;
  }

  let holes = 0;
  let aggregateHeight = 0;
  for (let c = 0; c < GRID_COLS; c++) {
    let blockFound = false;
    for (let r = 0; r < GRID_ROWS; r++) {
      if (tGrid[r * GRID_COLS + c]) {
        blockFound = true;
      } else if (blockFound) {
        holes++;
      }
    }
    let r = 0;
    while (r < GRID_ROWS && !tGrid[r * GRID_COLS + c]) r++;
    aggregateHeight += (GRID_ROWS - r);
  }

  for (let i = 0; i < shape.length; i++) {
    const py = dropY + shape[i][1];
    if (py >= 0) tGrid[py * GRID_COLS + (x + shape[i][0])] = 0;
  }

  return -holes * 10 - aggregateHeight;
};

const getBestTetrisMove = (type) => {
  let bestScore = -Infinity;
  let bestX = 0;
  let bestRot = 0;
  const rotations = TETRIS_SHAPES[type];

  for (let r = 0; r < rotations.length; r++) {
    const shape = rotations[r];
    let minX = 100;
    let maxX = -100;
    for (let i = 0; i < shape.length; i++) {
      minX = Math.min(minX, shape[i][0]);
      maxX = Math.max(maxX, shape[i][0]);
    }

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

const getTetrisPieceId = (x, y) => {
  if (activePiece) {
    const shape = TETRIS_SHAPES[activePiece.type][activePiece.rot];
    const pieceY = Math.floor(activePiece.y);
    for (let i = 0; i < shape.length; i++) {
      if (activePiece.x + shape[i][0] === x && pieceY + shape[i][1] === y) return activePiece.id;
    }
  }
  if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return 0;
  return tPieceId[y * GRID_COLS + x];
};

const tetrisBorderHands = (x, y, pieceId) => {
  const same = (dx, dy) => getTetrisPieceId(x + dx, y + dy) === pieceId;
  const up = same(0, -1);
  const down = same(0, 1);
  const left = same(-1, 0);
  const right = same(1, 0);
  const count = up + down + left + right;

  if (count === 1) {
    if (right || left) return H;
    if (down || up) return V;
  }

  if (count === 2) {
    if (left && right) return H;
    if (up && down) return V;
    if (down && right) return BR;
    if (down && left) return BL;
    if (up && right) return TR;
    if (up && left) return TL;
  }

  if (count === 3) {
    if (!down) return H;
    if (!up) return H;
    if (!left) return V;
    if (!right) return V;
  }

  return BR;
};

const spawnTetrisPiece = () => {
  const type = Math.floor(Math.random() * 7);
  const move = getBestTetrisMove(type);
  const shape = TETRIS_SHAPES[type][move.rot];
  const targetY = getTetrisDropY(shape, move.x);

  if (move.score === -Infinity || targetY < 0) {
    tetrisState = 'flash';
    stateTimer = 1.5;
    return;
  }

  let minY = 100;
  for (let i = 0; i < shape.length; i++) minY = Math.min(minY, shape[i][1]);

  activePiece = {
    id: ++pieceIdCounter,
    type,
    rot: move.rot,
    x: move.x,
    y: -4 - minY,
    targetY
  };
};

const updateTetris = (t) => {
  tetrisTicker.tick(t, (dt) => {
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
          const shape = TETRIS_SHAPES[activePiece.type][activePiece.rot];
          for (let i = 0; i < shape.length; i++) {
            const px = activePiece.x + shape[i][0];
            const py = activePiece.targetY + shape[i][1];
            if (py >= 0 && py < GRID_ROWS) {
              const idx = py * GRID_COLS + px;
              tGrid[idx] = activePiece.type + 1;
              tPieceId[idx] = activePiece.id;
            }
          }
          activePiece = null;
          spawnCooldown = 0.8;
        }
      }
    } else if (tetrisState === 'flash') {
      stateTimer -= dt;
      if (stateTimer <= 0) tetrisState = 'clear';
    } else if (tetrisState === 'clear') {
      tGrid.fill(0);
      tPieceId.fill(0);
      tetrisState = 'playing';
      activePiece = null;
      spawnCooldown = 0.5;
    }
  });
};

const tetrisIdle = (data, frameData) => {
  let pieceId = 0;
  let colorType = 0;

  const cellVal = tGrid[data.y * GRID_COLS + data.x];
  if (cellVal > 0) {
    pieceId = tPieceId[data.y * GRID_COLS + data.x];
    colorType = cellVal - 1;
  } else if (activePiece) {
    const shape = TETRIS_SHAPES[activePiece.type][activePiece.rot];
    const pieceY = Math.floor(activePiece.y);
    for (let i = 0; i < shape.length; i++) {
      if (activePiece.x + shape[i][0] === data.x && pieceY + shape[i][1] === data.y) {
        pieceId = activePiece.id;
        colorType = activePiece.type;
        break;
      }
    }
  }

  if (!pieceId) {
    setOut(data, 225, 225, [280, 50, 6]);
    return;
  }

  let color = TETRIS_COLORS[colorType];
  if (tetrisState === 'flash') {
    const bright = Math.sin(stateTimer * Math.PI * 8) > 0 ? 80 : 40;
    color = [color[0], color[1], bright];
  }

  const border = tetrisBorderHands(data.x, data.y, pieceId);
  setOut(data, border.h, border.m, color);
};

tetrisIdle.update = updateTetris;
