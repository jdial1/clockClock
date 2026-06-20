const snakeTicker = createTicker(0.1);

const SNAKE_BODY_COLOR = [120, 100, 58];
const SNAKE_BG_COLOR = [120, 40, 2];
const SNAKE_APPLE_BASE = [330, 100, 62];
const SNAKE_DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const SNAKE_MOVE_INTERVAL = 0.11;

const snakeBody = [];
let snakeApple = null;
let snakeMoveTimer = 0;

const snakeKey = (x, y) => y * GRID_COLS + x;

const angleBetween = (from, to) => Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI);

const snakeOccupied = (excludeTail = true) => {
  const end = excludeTail ? snakeBody.length - 1 : snakeBody.length;
  const set = new Set();
  for (let i = 0; i < end; i++) set.add(snakeKey(snakeBody[i].x, snakeBody[i].y));
  return set;
};

const spawnSnakeApple = () => {
  const occupied = snakeOccupied(false);
  const empty = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      if (!occupied.has(snakeKey(x, y))) empty.push({ x, y });
    }
  }
  if (!empty.length) {
    snakeApple = null;
    return;
  }
  snakeApple = empty[Math.floor(Math.random() * empty.length)];
};

const findSnakePath = (target) => {
  const head = snakeBody[0];
  const occupied = snakeOccupied(true);
  const startKey = snakeKey(head.x, head.y);
  const targetKey = snakeKey(target.x, target.y);
  const queue = [{ x: head.x, y: head.y, path: [] }];
  const visited = new Set([startKey]);

  while (queue.length) {
    const node = queue.shift();
    if (snakeKey(node.x, node.y) === targetKey) return node.path;

    for (const [dx, dy] of SNAKE_DIRS) {
      const nx = node.x + dx;
      const ny = node.y + dy;
      if (nx < 0 || nx >= GRID_COLS || ny < 0 || ny >= GRID_ROWS) continue;

      const key = snakeKey(nx, ny);
      if (visited.has(key)) continue;
      if (occupied.has(key) && key !== targetKey) continue;

      visited.add(key);
      queue.push({ x: nx, y: ny, path: node.path.concat({ x: nx, y: ny }) });
    }
  }
  return null;
};

const pickSnakeSurvivalStep = () => {
  const head = snakeBody[0];
  const occupied = snakeOccupied(true);
  const options = [];

  for (const [dx, dy] of SNAKE_DIRS) {
    const nx = head.x + dx;
    const ny = head.y + dy;
    if (nx < 0 || nx >= GRID_COLS || ny < 0 || ny >= GRID_ROWS) continue;
    if (occupied.has(snakeKey(nx, ny))) continue;
    options.push({ x: nx, y: ny });
  }

  if (!options.length) return null;
  return options[Math.floor(Math.random() * options.length)];
};

const resetSnake = () => {
  const cy = Math.floor(GRID_ROWS / 2);
  const cx = Math.floor(GRID_COLS / 2) - 2;
  snakeBody.length = 0;
  for (let i = 0; i < 4; i++) snakeBody.push({ x: cx + i, y: cy });
  snakeMoveTimer = SNAKE_MOVE_INTERVAL;
  spawnSnakeApple();
};

const advanceSnake = () => {
  if (!snakeApple) {
    resetSnake();
    return;
  }

  const path = findSnakePath(snakeApple);
  const step = path?.length ? path[0] : pickSnakeSurvivalStep();
  if (!step) {
    resetSnake();
    return;
  }

  snakeBody.unshift(step);
  const ate = step.x === snakeApple.x && step.y === snakeApple.y;

  if (!ate) snakeBody.pop();
  else spawnSnakeApple();

  if (snakeBody.slice(1).some((p) => p.x === step.x && p.y === step.y)) resetSnake();
};

const updateSnake = (t) => {
  snakeTicker.tick(t, (dt) => {
    snakeMoveTimer -= dt;
    if (snakeMoveTimer <= 0) {
      advanceSnake();
      snakeMoveTimer = SNAKE_MOVE_INTERVAL;
    }
  });
};

const snakeIdle = (data, frameData) => {
  if (snakeApple && data.x === snakeApple.x && data.y === snakeApple.y) {
    const pulse = 0.5 + 0.5 * Math.sin(frameData.t * 5);
    const beat = Math.sin(frameData.t * 8) * 12;
    const light = SNAKE_APPLE_BASE[2] + pulse * 28;
    setBorderOut(data, 270 + beat, 90 - beat, [SNAKE_APPLE_BASE[0], SNAKE_APPLE_BASE[1], light]);
    return;
  }

  const segIdx = snakeBody.findIndex((p) => p.x === data.x && p.y === data.y);
  if (segIdx === -1) {
    setArmsOut(data, 0, SNAKE_BG_COLOR);
    return;
  }

  if (segIdx === 0) {
    const spin = frameData.t * 540;
    setBorderOut(data, spin % 360, (360 - (spin % 360)) % 360, [120, 100, 72]);
    return;
  }

  const curr = snakeBody[segIdx];
  const prev = snakeBody[segIdx - 1];
  const next = snakeBody[segIdx + 1];
  const h = angleBetween(curr, prev);
  const m = next ? angleBetween(curr, next) : h;
  const bright = SNAKE_BODY_COLOR[2] + (1 - segIdx / snakeBody.length) * 18;
  setBorderOut(data, h, m, [SNAKE_BODY_COLOR[0], SNAKE_BODY_COLOR[1], bright]);
};

snakeIdle.update = updateSnake;
snakeIdle.onEnter = resetSnake;
